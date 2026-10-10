package ai.offgridmobile.keepalive

import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Starts and stops GenerationKeepAliveService from JS. Both calls are safe to repeat. */
class GenerationKeepAliveModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GenerationKeepAlive"

    @ReactMethod
    fun start() {
        val ctx = reactApplicationContext
        try {
            ContextCompat.startForegroundService(ctx, Intent(ctx, GenerationKeepAliveService::class.java))
        } catch (e: Exception) {
            // Android 12+ refuses to start one from the background (e.g. a queued reply starting
            // while minimized). The reply still runs; it just isn't protected.
            Log.w(TAG, "Could not start keep-alive service: ${e.message}")
        }
    }

    @ReactMethod
    fun stop() {
        val ctx = reactApplicationContext
        ctx.stopService(Intent(ctx, GenerationKeepAliveService::class.java))
    }

    companion object {
        private const val TAG = "GenerationKeepAlive"
    }
}
