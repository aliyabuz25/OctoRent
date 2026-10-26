#include "mainwindow.h"
#include "apiclient.h"
#include "connectionconfig.h"
#include "theme.h"

#include <QApplication>
#include <QJsonArray>
#include <QJsonObject>
#include <QTextStream>

static QString configArgPath(const QStringList &args) {
    const int i = args.indexOf("--config");
    if (i >= 0 && i + 1 < args.size()) return args.at(i + 1);
    return QString();
}

static int runSelfTest(const QString &configPath) {
    QTextStream out(stdout);
    const ConnectionConfig cfg = loadConnectionConfig(configPath);

    out << "config: " << (cfg.sourcePath.isEmpty() ? QString("<tapılmadı>") : cfg.sourcePath) << Qt::endl;
    if (cfg.username.isEmpty() || cfg.password.isEmpty()) {
        out << "connection.conf-da username/password yoxdur." << Qt::endl;
        return 1;
    }

    ApiClient api;
    api.setBaseUrl(cfg.url);

    QJsonObject user;
    if (!api.login(cfg.username, cfg.password, user)) {
        out << "login FAILED: " << api.lastError() << Qt::endl;
        return 1;
    }
    out << "login OK: " << user.value("username").toString() << " (" << user.value("role").toString() << ")" << Qt::endl;

    QJsonArray tenants;
    if (!api.listTenants(tenants)) {
        out << "listTenants FAILED: " << api.lastError() << Qt::endl;
        return 1;
    }
    out << "tenants: " << tenants.size() << Qt::endl;
    if (tenants.isEmpty()) return 0;

    const QString id = tenants.at(0).toObject().value("id").toString();
    QJsonObject req;
    if (!api.requestBackup(id, req))
        out << "requestBackup FAILED: " << api.lastError() << Qt::endl;
    else
        out << "requestBackup OK at " << req.value("requestedAt").toString() << Qt::endl;

    QByteArray bytes;
    if (!api.downloadBackup(id, bytes)) {
        out << "downloadBackup FAILED: " << api.lastError() << Qt::endl;
        return 1;
    }
    out << "backup bytes: " << bytes.size() << Qt::endl;
    return 0;
}

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    QApplication::setApplicationName("RunStock Admin");
    QApplication::setOrganizationName("RunStock");

    const QString configPath = configArgPath(app.arguments());

    if (app.arguments().contains("--selftest"))
        return runSelfTest(configPath);

    const QString theme = "dark";
    Theme::apply(theme);

    MainWindow window(configPath);
    window.show();

    return app.exec();
}
