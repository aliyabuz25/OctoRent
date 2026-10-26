#include "connectionconfig.h"

#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QProcessEnvironment>
#include <QStandardPaths>

static ConnectionConfig parseFile(const QString &path, bool &found) {
    ConnectionConfig cfg;
    cfg.sourcePath = path;
    found = false;
    QFile f(path);
    if (!f.open(QIODevice::ReadOnly | QIODevice::Text)) return cfg;
    found = true;

    while (!f.atEnd()) {
        QString line = QString::fromUtf8(f.readLine()).trimmed();
        if (line.isEmpty() || line.startsWith('#') || line.startsWith(';')) continue;
        if (line.startsWith('[') && line.endsWith(']')) continue;
        const int eq = line.indexOf('=');
        if (eq < 0) continue;
        const QString key = line.left(eq).trimmed().toLower();
        QString val = line.mid(eq + 1).trimmed();
        if (val.size() >= 2 && ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))))
            val = val.mid(1, val.size() - 2);
        if (key == "url" || key == "baseurl" || key == "base_url" || key == "server")
            cfg.url = val;
        else if (key == "username" || key == "user")
            cfg.username = val;
        else if (key == "password" || key == "pass")
            cfg.password = val;
    }
    f.close();
    return cfg;
}

QStringList connectionConfigSearchPaths() {
    QStringList paths;
    const QString env = QProcessEnvironment::systemEnvironment().value("RUNSTOCK_ADMIN_CONF");
    if (!env.isEmpty()) paths << env;
    paths << QDir(QCoreApplication::applicationDirPath()).filePath("connection.conf");
    paths << QDir::current().filePath("connection.conf");
    paths << QDir(QDir::homePath()).filePath(".config/runstock/connection.conf");
    const QString cfgDir = QStandardPaths::writableLocation(QStandardPaths::AppConfigLocation);
    if (!cfgDir.isEmpty()) paths << QDir(cfgDir).filePath("connection.conf");
    paths.removeDuplicates();
    return paths;
}

ConnectionConfig loadConnectionConfig(const QString &explicitPath) {
    if (!explicitPath.isEmpty()) {
        bool found = false;
        ConnectionConfig cfg = parseFile(explicitPath, found);
        return cfg;
    }
    for (const QString &p : connectionConfigSearchPaths()) {
        bool found = false;
        ConnectionConfig cfg = parseFile(p, found);
        if (found) return cfg;
    }
    return ConnectionConfig{};
}
