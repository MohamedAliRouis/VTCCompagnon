package com.vtccompagnon.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.vtccompagnon.R
import com.vtccompagnon.MainActivity

class WidgetOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var isOverlayShowing = false
    
    // Pour le drag
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    
    // Chronomètre natif
    private var tempsDebut: Long = 0
    private var etatActuel: String = "REPOS"
    private var tarifPriseEnCharge: Double = 2.50
    private var tarifParMinute: Double = 0.35
    
    private val handler = Handler(Looper.getMainLooper())
    private val chronoRunnable = object : Runnable {
        override fun run() {
            if (etatActuel != "REPOS" && tempsDebut > 0) {
                val tempsEcoule = (System.currentTimeMillis() - tempsDebut) / 1000
                val minutes = tempsEcoule / 60.0
                val revenu = tarifPriseEnCharge + (minutes * tarifParMinute)
                
                updateUI(etatActuel, tempsEcoule, revenu)
            }
            handler.postDelayed(this, 1000)
        }
    }

    companion object {
        const val CHANNEL_ID = "vtc_compagnon_overlay"
        const val NOTIFICATION_ID = 1001
        
        const val ACTION_SHOW = "ACTION_SHOW"
        const val ACTION_HIDE = "ACTION_HIDE"
        const val ACTION_UPDATE = "ACTION_UPDATE"
        
        const val EXTRA_ETAT = "EXTRA_ETAT"
        const val EXTRA_TEMPS_DEBUT = "EXTRA_TEMPS_DEBUT"
        const val EXTRA_TARIF_PEC = "EXTRA_TARIF_PEC"
        const val EXTRA_TARIF_MIN = "EXTRA_TARIF_MIN"

        private const val POSITION_PREFERENCES = "widget_overlay_position"
        private const val POSITION_X = "position_x"
        private const val POSITION_Y = "position_y"
        private const val DEFAULT_POSITION_X = 16
        private const val DEFAULT_POSITION_Y = 100
        
        @Volatile
        var isRunning = false
            private set
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> showOverlay()
            ACTION_HIDE -> hideOverlay()
            ACTION_UPDATE -> {
                etatActuel = intent.getStringExtra(EXTRA_ETAT) ?: "REPOS"
                tempsDebut = intent.getLongExtra(EXTRA_TEMPS_DEBUT, 0)
                tarifPriseEnCharge = intent.getDoubleExtra(EXTRA_TARIF_PEC, 2.50)
                tarifParMinute = intent.getDoubleExtra(EXTRA_TARIF_MIN, 0.35)
                
                // Démarrer/arrêter le chrono selon l'état
                if (etatActuel != "REPOS" && tempsDebut > 0) {
                    startChrono()
                } else {
                    stopChrono()
                }
                
                // Mise à jour immédiate
                val tempsEcoule = if (tempsDebut > 0) (System.currentTimeMillis() - tempsDebut) / 1000 else 0
                val minutes = tempsEcoule / 60.0
                val revenu = tarifPriseEnCharge + (minutes * tarifParMinute)
                updateUI(etatActuel, tempsEcoule, revenu)
            }
        }
        
        startForeground(NOTIFICATION_ID, createNotification())
        isRunning = true
        
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopChrono()
        hideOverlay()
        isRunning = false
    }

    private fun startChrono() {
        handler.removeCallbacks(chronoRunnable)
        handler.post(chronoRunnable)
    }

    private fun stopChrono() {
        handler.removeCallbacks(chronoRunnable)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "VTC Compagnon Widget",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Widget flottant pour suivi de course"
                setShowBadge(false)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("VTC Compagnon actif")
            .setContentText("Widget de suivi en cours d'utilisation")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    @Suppress("ClickableViewAccessibility")
    private fun showOverlay() {
        if (isOverlayShowing || overlayView != null) return
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this)) {
            return
        }

        overlayView = LayoutInflater.from(this).inflate(R.layout.widget_overlay, null)

        val preferences = getSharedPreferences(POSITION_PREFERENCES, Context.MODE_PRIVATE)
        
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = preferences.getInt(POSITION_X, DEFAULT_POSITION_X)
            y = preferences.getInt(POSITION_Y, DEFAULT_POSITION_Y)
        }

        constrainPositionToScreen(params)

        setupDragListener(params)
        setupButtons()

        try {
            windowManager?.addView(overlayView, params)
            isOverlayShowing = true
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @Suppress("ClickableViewAccessibility")
    private fun setupDragListener(params: WindowManager.LayoutParams) {
        overlayView?.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (initialTouchX - event.rawX).toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    constrainPositionToScreen(params)
                    try {
                        windowManager?.updateViewLayout(overlayView, params)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    savePosition(params)
                    true
                }
                else -> false
            }
        }
    }

    private fun constrainPositionToScreen(params: WindowManager.LayoutParams) {
        val view = overlayView ?: return
        view.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED)

        val displayMetrics = resources.displayMetrics
        val maxX = (displayMetrics.widthPixels - view.measuredWidth).coerceAtLeast(0)
        val maxY = (displayMetrics.heightPixels - view.measuredHeight).coerceAtLeast(0)

        params.x = params.x.coerceIn(0, maxX)
        params.y = params.y.coerceIn(0, maxY)
    }

    private fun savePosition(params: WindowManager.LayoutParams) {
        getSharedPreferences(POSITION_PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putInt(POSITION_X, params.x)
            .putInt(POSITION_Y, params.y)
            .apply()
    }

    private fun setupButtons() {
        overlayView?.let { view ->
            // Bouton principal - envoie un broadcast + vibration
            view.findViewById<Button>(R.id.btn_action)?.setOnClickListener {
                vibrate()
                val intent = Intent(this, WidgetActionReceiver::class.java).apply {
                    action = WidgetActionReceiver.ACTION_PRINCIPALE
                }
                sendBroadcast(intent)
            }
            
            // Bouton secondaire - envoie un broadcast + vibration
            view.findViewById<Button>(R.id.btn_secondaire)?.setOnClickListener {
                vibrate()
                val intent = Intent(this, WidgetActionReceiver::class.java).apply {
                    action = WidgetActionReceiver.ACTION_SECONDAIRE
                }
                sendBroadcast(intent)
            }
        }
    }
    
    // Vibration pour retour haptique (sécurité conduite)
    private fun vibrate() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as android.os.VibratorManager
                vibratorManager.defaultVibrator.vibrate(
                    android.os.VibrationEffect.createOneShot(50, android.os.VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(
                        android.os.VibrationEffect.createOneShot(50, android.os.VibrationEffect.DEFAULT_AMPLITUDE)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(50)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun hideOverlay() {
        overlayView?.let {
            try {
                windowManager?.removeView(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        overlayView = null
        isOverlayShowing = false
    }

    private fun updateUI(etat: String, tempsEcoule: Long, revenu: Double) {
        overlayView?.let { view ->
            // État
            view.findViewById<TextView>(R.id.tv_etat)?.text = when(etat) {
                "REPOS" -> "EN REPOS"
                "PICKUP" -> "VERS CLIENT"
                "EN_COURSE" -> "EN COURSE"
                else -> etat
            }
            
            // Temps et revenu
            view.findViewById<TextView>(R.id.tv_temps)?.text = "⏱️ ${formatTemps(tempsEcoule)}"
            view.findViewById<TextView>(R.id.tv_revenu)?.text = "💰 ${formatArgent(revenu)}"
            
            // Boutons
            val btnPrincipal = view.findViewById<Button>(R.id.btn_action)
            val btnSecondaire = view.findViewById<Button>(R.id.btn_secondaire)
            
            when(etat) {
                "REPOS" -> {
                    btnPrincipal?.text = "▶ DÉMARRER"
                    btnSecondaire?.visibility = View.GONE
                }
                "PICKUP" -> {
                    btnPrincipal?.text = "CLIENT MONTÉ"
                    btnSecondaire?.text = "ANNULER"
                    btnSecondaire?.visibility = View.VISIBLE
                }
                "EN_COURSE" -> {
                    btnPrincipal?.text = "ARRIVÉE"
                    btnSecondaire?.text = "TERMINER"
                    btnSecondaire?.visibility = View.VISIBLE
                }
            }
            
            // Couleur
            val couleur = when(etat) {
                "REPOS" -> 0xE64a4a6a.toInt()
                "PICKUP" -> 0xE6f39c12.toInt()
                "EN_COURSE" -> 0xE627ae60.toInt()
                else -> 0xE64a4a6a.toInt()
            }
            view.setBackgroundColor(couleur)
        }
    }

    private fun formatTemps(secondes: Long): String {
        val h = secondes / 3600
        val m = (secondes % 3600) / 60
        val s = secondes % 60
        
        return if (h > 0) {
            String.format("%02d:%02d:%02d", h, m, s)
        } else {
            String.format("%02d:%02d", m, s)
        }
    }

    private fun formatArgent(montant: Double): String {
        return String.format("%.2f €", montant).replace(".", ",")
    }
}
