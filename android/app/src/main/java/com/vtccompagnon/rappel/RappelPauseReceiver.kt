package com.vtccompagnon.rappel

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.vtccompagnon.MainActivity
import com.vtccompagnon.R

/**
 * Rappel « prenez une pause ».
 *
 * Déclenché par AlarmManager et planifié depuis le JS : fonctionne app en
 * arrière-plan ou tuée. Une fois déclenché, il se replanifie toutes les
 * `intervalleMs` jusqu'à ce que le JS l'annule (pause, fin de service).
 *
 * Limite connue : les alarmes sont effacées au redémarrage du téléphone ; le
 * rappel est reprogrammé à la prochaine ouverture de l'app.
 */
class RappelPauseReceiver : BroadcastReceiver() {

    companion object {
        private const val CANAL_ID = "vtc_rappel_pause"
        private const val NOTIFICATION_ID = 2001
        private const val REQUETE_ALARME = 2001
        private const val EXTRA_INTERVALLE_MS = "EXTRA_INTERVALLE_MS"
        private const val EXTRA_DEPUIS_MS = "EXTRA_DEPUIS_MS"

        private fun intentionAlarme(
            context: Context,
            intervalleMs: Long,
            depuisMs: Long,
            flags: Int,
        ): PendingIntent? {
            val intent = Intent(context, RappelPauseReceiver::class.java).apply {
                putExtra(EXTRA_INTERVALLE_MS, intervalleMs)
                putExtra(EXTRA_DEPUIS_MS, depuisMs)
            }
            return PendingIntent.getBroadcast(
                context,
                REQUETE_ALARME,
                intent,
                flags or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        fun planifier(context: Context, declenchementMs: Long, intervalleMs: Long, depuisMs: Long) {
            val alarmes = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intention = intentionAlarme(
                context, intervalleMs, depuisMs, PendingIntent.FLAG_UPDATE_CURRENT,
            ) ?: return
            // Alarme inexacte mais autorisée en veille profonde : quelques minutes
            // de décalage sont sans conséquence pour un rappel de pause, et on
            // évite ainsi la permission d'alarme exacte.
            alarmes.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, declenchementMs, intention)
        }

        fun annuler(context: Context) {
            val alarmes = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            // FLAG_NO_CREATE : on ne récupère l'intention que si elle existe.
            // La correspondance ignore les extras, donc les valeurs 0 suffisent.
            intentionAlarme(context, 0, 0, PendingIntent.FLAG_NO_CREATE)?.let {
                alarmes.cancel(it)
                it.cancel()
            }
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val intervalleMs = intent.getLongExtra(EXTRA_INTERVALLE_MS, 0)
        val depuisMs = intent.getLongExtra(EXTRA_DEPUIS_MS, 0)

        afficher(context, depuisMs)

        if (intervalleMs > 0) {
            planifier(context, System.currentTimeMillis() + intervalleMs, intervalleMs, depuisMs)
        }
    }

    private fun afficher(context: Context, depuisMs: Long) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Importance « par défaut » : son + icône dans la barre d'état, mais pas
            // de bandeau qui recouvrirait la navigation pendant la conduite.
            val canal = NotificationChannel(
                CANAL_ID,
                "Rappel de pause",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Vous rappelle de faire une pause après un long moment de service"
            }
            context.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(canal)
        }

        val ouvrirApp = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val texte = if (depuisMs > 0) {
            val minutes = ((System.currentTimeMillis() - depuisMs) / 60_000).coerceAtLeast(0)
            "Vous êtes en service depuis ${formaterDuree(minutes)} sans pause."
        } else {
            "Vous êtes en service depuis longtemps sans pause."
        }

        val notification = NotificationCompat.Builder(context, CANAL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Pensez à faire une pause")
            .setContentText(texte)
            .setContentIntent(ouvrirApp)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    private fun formaterDuree(minutes: Long): String {
        val h = minutes / 60
        val m = minutes % 60
        return if (m == 0L) "$h h" else "$h h ${m.toString().padStart(2, '0')}"
    }
}
