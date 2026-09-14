package com.vtccompagnon.rappel

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Pont JS -> AlarmManager pour le rappel de pause. */
class RappelPauseModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "RappelPause"

    @ReactMethod
    fun planifier(declenchementMs: Double, intervalleMs: Double, depuisMs: Double, promise: Promise) {
        try {
            RappelPauseReceiver.planifier(
                reactApplicationContext,
                declenchementMs.toLong(),
                intervalleMs.toLong(),
                depuisMs.toLong(),
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RAPPEL_PAUSE", e.message, e)
        }
    }

    @ReactMethod
    fun annuler(promise: Promise) {
        try {
            RappelPauseReceiver.annuler(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RAPPEL_PAUSE", e.message, e)
        }
    }
}
