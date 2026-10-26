#ifndef CONNECTIONCONFIG_H
#define CONNECTIONCONFIG_H

#include <QString>
#include <QStringList>

struct ConnectionConfig {
    QString url = "http://localhost:3001";
    QString username;
    QString password;
    QString sourcePath;
};

// explicitPath boş deyilsə yalnız o fayl oxunur.
ConnectionConfig loadConnectionConfig(const QString &explicitPath = QString());

// Axtarış sırası (ilk tapılan istifadə olunur).
QStringList connectionConfigSearchPaths();

#endif // CONNECTIONCONFIG_H
