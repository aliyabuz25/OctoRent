#ifndef APICLIENT_H
#define APICLIENT_H

#include <QObject>
#include <QString>
#include <QByteArray>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>

class QNetworkAccessManager;

class ApiClient : public QObject {
    Q_OBJECT
public:
    explicit ApiClient(QObject *parent = nullptr);

    void setBaseUrl(const QString &url);
    QString baseUrl() const;
    void setToken(const QString &token);
    QString token() const;
    void setActAsTenant(const QString &tenantId);
    QString actAsTenant() const;

    bool login(const QString &username, const QString &password, QJsonObject &userOut);
    bool listTenants(QJsonArray &out);
    bool createTenant(const QString &name, const QString &username, const QString &password, QJsonObject &tenantOut);
    bool updateTenant(const QString &id, const QString &name, QJsonObject &tenantOut);
    bool requestBackup(const QString &id, QJsonObject &out);
    bool downloadBackup(const QString &id, QByteArray &bytes);

    bool listItems(QJsonArray &out);
    bool createItem(const QJsonObject &body, QJsonObject &out);
    bool updateItem(const QString &id, const QJsonObject &body, QJsonObject &out);
    bool deleteItem(const QString &id);
    bool moveStock(const QString &id, int delta, const QString &note, QJsonObject &out);

    bool listPurchases(QJsonArray &out);
    bool createPurchase(const QJsonObject &body, QJsonObject &out);
    bool deletePurchase(const QString &id);

    bool listRentals(QJsonArray &out);
    bool createRental(const QJsonObject &body, QJsonObject &out);
    bool deleteRental(const QString &id);

    bool listMovements(QJsonArray &out);

    QString lastError() const { return m_lastError; }
    int lastStatus() const { return m_lastStatus; }

private:
    QByteArray send(const QString &method, const QString &path, const QJsonObject &body, int &status, bool &ok);
    QJsonDocument call(const QString &method, const QString &path, const QJsonObject &body, bool &ok);

    QNetworkAccessManager *m_nam;
    QString m_baseUrl;
    QString m_token;
    QString m_actAs;
    QString m_lastError;
    int m_lastStatus = 0;
};

#endif // APICLIENT_H
