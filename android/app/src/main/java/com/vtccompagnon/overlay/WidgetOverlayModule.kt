package com.vtccompagnon.overlay

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class WidgetOverlayModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetOverlay"

    init {
        // Enregistrer le contexte React Native dans le receiver
        WidgetActionReceiver.reactContext = reactContext
    }

    private fun sendEvent(eventName: String) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, null)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        val context = reactApplicationContext
        val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.provider.Settings.canDrawOverlays(context)
        } else {
            true
        }
        promise.resolve(hasPermission)
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val context = reactApplicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(context)) {
                val intent = Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun showOverlay(promise: Promise) {
        val context = reactApplicationContext
        
        val intent = Intent(context, WidgetOverlayService::class.java).apply {
            action = WidgetOverlayService.ACTION_SHOW
        }
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Impossible de démarrer le service: ${e.message}")
        }
    }

    @ReactMethod
    fun hideOverlay(promise: Promise) {
        val context = reactApplicationContext
        val intent = Intent(context, WidgetOverlayService::class.java).apply {
            action = WidgetOverlayService.ACTION_HIDE
        }
        
        try {
            context.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Impossible d'arrêter le service: ${e.message}")
        }
    }

    @ReactMethod
    fun updateOverlay(etat: String, tempsDebut: Double, tarifPec: Double, tarifMin: Double, promise: Promise) {
        val context = reactApplicationContext
        val intent = Intent(context, WidgetOverlayService::class.java).apply {
            action = WidgetOverlayService.ACTION_UPDATE
            putExtra(WidgetOverlayService.EXTRA_ETAT, etat)
            putExtra(WidgetOverlayService.EXTRA_TEMPS_DEBUT, tempsDebut.toLong())
            putExtra(WidgetOverlayService.EXTRA_TARIF_PEC, tarifPec)
            putExtra(WidgetOverlayService.EXTRA_TARIF_MIN, tarifMin)
        }
        
        try {
            context.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Impossible de mettre à jour: ${e.message}")
        }
    }

    @ReactMethod
    fun isOverlayRunning(promise: Promise) {
        promise.resolve(WidgetOverlayService.isRunning)
    }
    
    @ReactMethod
    fun addListener(eventName: String) {
        // Nécessaire pour NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Nécessaire pour NativeEventEmitter
    }
}
