#include "theme.h"

#include <QApplication>
#include <QDebug>
#include <QFile>
#include <QSettings>

static QString g_current = "default";

void Theme::apply(const QString &key) {
    g_current = key.isEmpty() ? "default" : key;
    if (g_current == "light" || g_current == "dark") {
        QFile f(QString(":/themes/%1.qss").arg(g_current));
        if (f.open(QIODevice::ReadOnly)) {
            qApp->setStyleSheet(QString::fromUtf8(f.readAll()));
        } else {
            qWarning() << "theme" << g_current << "not found:" << f.fileName();
            qApp->setStyleSheet(QString());
        }
    } else {
        qApp->setStyleSheet(QString());
    }
}

QString Theme::saved() { return QSettings().value("theme", "default").toString(); }

QString Theme::current() { return g_current; }

bool Theme::isDark() { return g_current == "dark"; }

void Theme::save(const QString &key) { QSettings().setValue("theme", key); }
