package com.vtccompagnon.overlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BroadcastReceiver pour recevoir les actions du widget overlay
 * et les transmettre à React Native
 */
class WidgetActionReceiver : BroadcastReceiver() {
    
    companion object {
        const val ACTION_PRINCIPALE = "com.vtccompagnon.ACTION_PRINCIPALE"
        const val ACTION_SECONDAIRE = "com.vtccompagnon.ACTION_SECONDAIRE"
        
        // Référence au contexte React Native (sera définie par le module)
        @Volatile
        var reactContext: ReactApplicationContext? = null
        
        /**
         * Envoyer un événement à React Native
         */
        fun sendEventToReactNative(eventName: String) {
            reactContext?.let { context ->
                try {
                    context
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, null)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
    
    override fun onReceive(context: Context?, intent: Intent?) {
        when (intent?.action) {
            ACTION_PRINCIPALE -> {
                sendEventToReactNative("WidgetActionPrincipale")
            }
            ACTION_SECONDAIRE -> {
                sendEventToReactNative("WidgetActionSecondaire")
            }
        }
    }
}
