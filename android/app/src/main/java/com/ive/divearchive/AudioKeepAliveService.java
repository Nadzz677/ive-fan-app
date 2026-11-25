package com.ive.divearchive;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

/**
 * Spotify-Style Android System MediaSession + Foreground Playback Service.
 *
 * 1. Registers an active `android.media.session.MediaSession` + `Notification.MediaStyle`
 *    so Android 13–17 promotes IVE: Dive Archive into the Quick Settings Media Carousel,
 *    Lock Screen Player, and Vivo Origin Island / Dynamic Island pill!
 * 2. Acquires CPU WakeLock + Low-Latency WifiLock while leaving AudioFocus ownership
 *    exclusively to `KeepAliveWebView` (prevents intra-app AudioFocus self-theft).
 * 3. Downloads album cover artwork asynchronously and routes hardware/notification
 *    Play, Pause, Next, Previous, and Seek controls directly back to `player.tsx`.
 */
public class AudioKeepAliveService extends Service {
    public static volatile boolean isPlaybackActive = false;
    public static volatile boolean isSessionActive = false;

    public interface MediaCommandListener {
        void onCommand(String command, double seekSeconds);
    }

    private static volatile MediaCommandListener commandListener;

    public static void setMediaCommandListener(MediaCommandListener listener) {
        commandListener = listener;
    }

    public static final String CHANNEL_ID = "ive_dive_archive_media_session";
    public static final int NOTIFICATION_ID = 20211201;

    public static final String ACTION_UPDATE_MEDIA = "com.ive.divearchive.UPDATE_MEDIA";
    public static final String ACTION_STOP_SERVICE = "com.ive.divearchive.STOP_SERVICE";
    public static final String ACTION_BTN_PREV = "com.ive.divearchive.BTN_PREV";
    public static final String ACTION_BTN_TOGGLE = "com.ive.divearchive.BTN_TOGGLE";
    public static final String ACTION_BTN_NEXT = "com.ive.divearchive.BTN_NEXT";

    public static final String EXTRA_PLAYING = "extra_playing";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ALBUM = "extra_album";
    public static final String EXTRA_ARTWORK_URL = "extra_artwork_url";
    public static final String EXTRA_POSITION_MS = "extra_position_ms";
    public static final String EXTRA_DURATION_MS = "extra_duration_ms";

    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private final ExecutorService artworkExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private String currentTitle = "IVE: Dive Archive";
    private String currentArtist = "IVE";
    private String currentAlbum = "Dive Archive";
    private String currentArtworkUrl = "";
    private Bitmap currentArtworkBitmap = null;
    private boolean currentPlaying = false;
    private long currentPositionMs = 0L;
    private long currentDurationMs = 180000L;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();
    }

    private void initMediaSession() {
        mediaSession = new MediaSession(this, "IVEDiveArchiveMediaSession");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                dispatchToWeb("play", 0);
            }

            @Override
            public void onPause() {
                dispatchToWeb("pause", 0);
            }

            @Override
            public void onSkipToNext() {
                dispatchToWeb("next", 0);
            }

            @Override
            public void onSkipToPrevious() {
                dispatchToWeb("prev", 0);
            }

            @Override
            public void onSeekTo(long pos) {
                dispatchToWeb("seek", pos / 1000.0);
            }

            @Override
            public void onStop() {
                dispatchToWeb("pause", 0);
            }
        });
        mediaSession.setActive(true);
    }

    private void dispatchToWeb(String cmd, double seekSec) {
        MediaCommandListener listener = commandListener;
        if (listener != null) {
            listener.onCommand(cmd, seekSec);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP_SERVICE.equals(action)) {
            isPlaybackActive = false;
            isSessionActive = false;
            currentPlaying = false;
            releaseLocks();
            if (mediaSession != null) {
                mediaSession.setActive(false);
            }
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        // Handle direct taps on Notification Media Action buttons
        if (ACTION_BTN_PREV.equals(action)) {
            dispatchToWeb("prev", 0);
            return START_STICKY;
        }
        if (ACTION_BTN_TOGGLE.equals(action)) {
            dispatchToWeb(currentPlaying ? "pause" : "play", 0);
            return START_STICKY;
        }
        if (ACTION_BTN_NEXT.equals(action)) {
            dispatchToWeb("next", 0);
            return START_STICKY;
        }

        // Otherwise update MediaSession state & Notification card
        boolean playing = intent.getBooleanExtra(EXTRA_PLAYING, currentPlaying);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String artist = intent.getStringExtra(EXTRA_ARTIST);
        String album = intent.getStringExtra(EXTRA_ALBUM);
        String artworkUrl = intent.getStringExtra(EXTRA_ARTWORK_URL);
        long posMs = intent.getLongExtra(EXTRA_POSITION_MS, currentPositionMs);
        long durMs = intent.getLongExtra(EXTRA_DURATION_MS, currentDurationMs);

        currentPlaying = playing;
        isPlaybackActive = playing;
        isSessionActive = true;

        if (title != null && !title.trim().isEmpty()) currentTitle = title.trim();
        if (artist != null && !artist.trim().isEmpty()) currentArtist = artist.trim();
        if (album != null && !album.trim().isEmpty()) currentAlbum = album.trim();
        if (posMs >= 0) currentPositionMs = posMs;
        if (durMs > 0) currentDurationMs = durMs;

        if (mediaSession != null && !mediaSession.isActive()) {
            mediaSession.setActive(true);
        }
        if (playing) {
            acquireLocks();
        } else {
            releaseLocks();
        }

        // Load new album cover bitmap asynchronously when artworkUrl changes
        if (artworkUrl != null && !artworkUrl.trim().isEmpty() && !artworkUrl.equals(currentArtworkUrl)) {
            currentArtworkUrl = artworkUrl;
            final String urlToFetch = artworkUrl;
            artworkExecutor.execute(() -> {
                Bitmap bmp = downloadBitmap(urlToFetch);
                if (bmp != null) {
                    mainHandler.post(() -> {
                        if (urlToFetch.equals(currentArtworkUrl) && isSessionActive) {
                            currentArtworkBitmap = bmp;
                            updateSessionAndNotification();
                        }
                    });
                }
            });
        }

        updateSessionAndNotification();
        return START_STICKY;
    }

    private void updateSessionAndNotification() {
        if (mediaSession == null) return;

        // 1. Update PlaybackState (enables Android 13-17 scrubbing bar & lockscreen buttons)
        long actions =
            PlaybackState.ACTION_PLAY |
            PlaybackState.ACTION_PAUSE |
            PlaybackState.ACTION_PLAY_PAUSE |
            PlaybackState.ACTION_SKIP_TO_NEXT |
            PlaybackState.ACTION_SKIP_TO_PREVIOUS |
            PlaybackState.ACTION_SEEK_TO;

        PlaybackState playbackState = new PlaybackState.Builder()
            .setActions(actions)
            .setState(
                currentPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                currentPositionMs,
                currentPlaying ? 1.0f : 0.0f
            )
            .build();
        mediaSession.setPlaybackState(playbackState);

        // 2. Update MediaMetadata (Song title, artist, album, duration, and cover art)
        MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadata.METADATA_KEY_DURATION, currentDurationMs);

        if (currentArtworkBitmap != null) {
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, currentArtworkBitmap);
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, currentArtworkBitmap);
        }
        mediaSession.setMetadata(metaBuilder.build());

        // 3. Build Notification.MediaStyle card (promotes into Android Media Panel & Vivo Origin Island!)
        Notification notification = buildMediaStyleNotification();
        NotificationManager nm = getSystemService(NotificationManager.class);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {
            if (nm != null) nm.notify(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildMediaStyleNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openIntent, piFlags);

        PendingIntent prevPending = PendingIntent.getService(
            this,
            101,
            new Intent(this, AudioKeepAliveService.class).setAction(ACTION_BTN_PREV),
            piFlags
        );
        PendingIntent togglePending = PendingIntent.getService(
            this,
            102,
            new Intent(this, AudioKeepAliveService.class).setAction(ACTION_BTN_TOGGLE),
            piFlags
        );
        PendingIntent nextPending = PendingIntent.getService(
            this,
            103,
            new Intent(this, AudioKeepAliveService.class).setAction(ACTION_BTN_NEXT),
            piFlags
        );

        Notification.Action prevAction = new Notification.Action.Builder(
            android.R.drawable.ic_media_previous,
            "Previous",
            prevPending
        ).build();

        Notification.Action playPauseAction = new Notification.Action.Builder(
            currentPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
            currentPlaying ? "Pause" : "Play",
            togglePending
        ).build();

        Notification.Action nextAction = new Notification.Action.Builder(
            android.R.drawable.ic_media_next,
            "Next",
            nextPending
        ).build();

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1, 2);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder
            .setStyle(mediaStyle)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setContentIntent(contentIntent)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setOngoing(currentPlaying)
            .setOnlyAlertOnce(true)
            .addAction(prevAction)
            .addAction(playPauseAction)
            .addAction(nextAction);

        if (currentArtworkBitmap != null) {
            builder.setLargeIcon(currentArtworkBitmap);
        }

        return builder.build();
    }

    private static final int MAX_ARTWORK_BYTES = 5 * 1024 * 1024;

    private static boolean isSafePublicAddress(String host) {
        if (host == null || host.trim().isEmpty()) return false;
        String lower = host.trim().toLowerCase();
        if (lower.equals("localhost") || lower.endsWith(".local") || lower.endsWith(".internal")) {
            return false;
        }
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            if (addresses == null || addresses.length == 0) return false;
            for (InetAddress addr : addresses) {
                if (
                    addr.isAnyLocalAddress() ||
                    addr.isLoopbackAddress() ||
                    addr.isLinkLocalAddress() ||
                    addr.isSiteLocalAddress() ||
                    addr.isMulticastAddress()
                ) {
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static int calculateInSampleSize(BitmapFactory.Options options, int reqWidth, int reqHeight) {
        final int height = options.outHeight;
        final int width = options.outWidth;
        int inSampleSize = 1;
        if (height > reqHeight || width > reqWidth) {
            final int halfHeight = height / 2;
            final int halfWidth = width / 2;
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2;
            }
        }
        return inSampleSize;
    }

    private Bitmap downloadBitmap(String urlStr) {
        if (urlStr == null || urlStr.length() > 2048) return null;
        HttpsURLConnection conn = null;
        try {
            URL url = new URL(urlStr.trim());
            if (!"https".equalsIgnoreCase(url.getProtocol())) return null;
            if (url.getUserInfo() != null && !url.getUserInfo().isEmpty()) return null;
            if (!isSafePublicAddress(url.getHost())) return null;

            conn = (HttpsURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setDoInput(true);
            conn.connect();

            int status = conn.getResponseCode();
            int redirects = 0;
            while ((status == HttpURLConnection.HTTP_MOVED_PERM ||
                    status == HttpURLConnection.HTTP_MOVED_TEMP ||
                    status == HttpURLConnection.HTTP_SEE_OTHER ||
                    status == 307 ||
                    status == 308) && redirects < 2) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                conn = null;
                if (location == null) return null;
                URL nextUrl = new URL(url, location);
                if (!"https".equalsIgnoreCase(nextUrl.getProtocol())) return null;
                if (!isSafePublicAddress(nextUrl.getHost())) return null;
                url = nextUrl;
                conn = (HttpsURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.setDoInput(true);
                conn.connect();
                status = conn.getResponseCode();
                redirects++;
            }

            if (status < 200 || status >= 300) return null;
            int contentLength = conn.getContentLength();
            if (contentLength > MAX_ARTWORK_BYTES) return null;

            byte[] imageBytes;
            try (InputStream is = conn.getInputStream();
                 ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                byte[] chunk = new byte[8192];
                int total = 0;
                int n;
                while ((n = is.read(chunk)) != -1) {
                    total += n;
                    if (total > MAX_ARTWORK_BYTES) return null;
                    buffer.write(chunk, 0, n);
                }
                imageBytes = buffer.toByteArray();
            }

            if (imageBytes.length == 0) return null;

            BitmapFactory.Options boundsOpts = new BitmapFactory.Options();
            boundsOpts.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, boundsOpts);
            if (boundsOpts.outWidth <= 0 || boundsOpts.outHeight <= 0) return null;
            if (boundsOpts.outWidth > 8192 || boundsOpts.outHeight > 8192) return null;

            BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
            decodeOpts.inSampleSize = calculateInSampleSize(boundsOpts, 512, 512);
            decodeOpts.inPreferredConfig = Bitmap.Config.ARGB_8888;
            Bitmap raw = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, decodeOpts);
            if (raw != null && (raw.getWidth() > 512 || raw.getHeight() > 512)) {
                return Bitmap.createScaledBitmap(raw, 512, 512, true);
            }
            return raw;
        } catch (Exception ignored) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Now Playing Media Controls",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Spotify-style media controls for IVE: Dive Archive");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            manager.createNotificationChannel(channel);
        }
    }

    private void acquireLocks() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "IVEDiveArchive::MediaPlaybackWakeLock"
                    );
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L);
            }
        } catch (Exception ignored) {}

        try {
            if (wifiLock == null) {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    int lockMode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                        ? WifiManager.WIFI_MODE_FULL_LOW_LATENCY
                        : WifiManager.WIFI_MODE_FULL_HIGH_PERF;
                    wifiLock = wm.createWifiLock(lockMode, "IVEDiveArchive::MediaWifiLock");
                    wifiLock.setReferenceCounted(false);
                }
            }
            if (wifiLock != null && !wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        } catch (Exception ignored) {}
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}

        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        isPlaybackActive = false;
        isSessionActive = false;
        releaseLocks();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        artworkExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
