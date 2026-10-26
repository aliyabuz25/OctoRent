#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QJsonArray>
#include "connectionconfig.h"

class QPushButton;
class QTableWidget;
class QLabel;
class ApiClient;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(const QString &configPath = QString(), QWidget *parent = nullptr);

private slots:
    void onConnect();
    void onRefresh();
    void onCreate();
    void onEdit();
    void onOpen();
    void onDownloadBackup();
    void onInspectBackup();

private:
    void buildUi();
    void setConnected(bool on);
    void setBusy(bool busy);
    void info(const QString &msg);
    void warn(const QString &msg, const QString &title = "Xəta");
    int selectedRow() const;
    QString selectedTenantId() const;
    QString selectedTenantName() const;

    ApiClient *m_api;
    QPushButton *m_connectBtn;
    QPushButton *m_refreshBtn;
    QPushButton *m_createBtn;
    QPushButton *m_editBtn;
    QPushButton *m_openBtn;
    QPushButton *m_downloadBtn;
    QPushButton *m_inspectBtn;
    QTableWidget *m_table;
    QLabel *m_status;
    QJsonArray m_tenants;
    bool m_connected = false;
    QString m_configPath;
    ConnectionConfig m_cfg;
};

#endif // MAINWINDOW_H
