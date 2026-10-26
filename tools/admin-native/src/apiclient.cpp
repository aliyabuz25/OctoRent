#include "apiclient.h"

#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QEventLoop>
#include <QJsonDocument>
#include <QJsonValue>
#include <QUrl>

ApiClient::ApiClient(QObject *parent)
    : QObject(parent), m_nam(new QNetworkAccessManager(this)) {}

void ApiClient::setBaseUrl(const QString &url) {
    m_baseUrl = url.trimmed();
    while (m_baseUrl.endsWith('/')) m_baseUrl.chop(1);
    if (m_baseUrl.isEmpty()) m_baseUrl = "http://localhost:3001";
}

QString ApiClient::baseUrl() const { return m_baseUrl; }

void ApiClient::setToken(const QString &token) { m_token = token; }

QString ApiClient::token() const { return m_token; }

void ApiClient::setActAsTenant(const QString &tenantId) { m_actAs = tenantId; }

QString ApiClient::actAsTenant() const { return m_actAs; }

QByteArray ApiClient::send(const QString &method, const QString &path, const QJsonObject &body, int &status, bool &ok) {
    status = 0;
    ok = false;
    m_lastStatus = 0;
    m_lastError.clear();

    QNetworkRequest req(QUrl(m_baseUrl + path));
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    if (!m_token.isEmpty())
        req.setRawHeader("Authorization", ("Bearer " + m_token).toUtf8());
    if (!m_actAs.isEmpty())
        req.setRawHeader("X-Act-As-Tenant", m_actAs.toUtf8());

    const QByteArray payload = body.isEmpty() ? QByteArray() : QJsonDocument(body).toJson(QJsonDocument::Compact);

    QNetworkReply *reply = nullptr;
    if (method == "GET") reply = m_nam->get(req);
    else if (method == "POST") reply = m_nam->post(req, payload);
    else if (method == "PUT") reply = m_nam->put(req, payload);
    else if (method == "DELETE") reply = m_nam->deleteResource(req);
    if (!reply) {
        m_lastError = "Sorğu yaradıla bilmədi";
        return {};
    }

    QEventLoop loop;
    connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    loop.exec();

    const QByteArray data = reply->readAll();
    status = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    m_lastStatus = status;
    if (reply->error() != QNetworkReply::NoError && status == 0) {
        m_lastError = reply->errorString();
        reply->deleteLater();
        return data;
    }
    ok = status >= 200 && status < 300;
    if (!ok) {
        const QJsonObject obj = QJsonDocument::fromJson(data).object();
        const QString msg = obj.value("error").toString();
        m_lastError = msg.isEmpty() ? QString("HTTP %1").arg(status) : msg;
    }
    reply->deleteLater();
    return data;
}

QJsonDocument ApiClient::call(const QString &method, const QString &path, const QJsonObject &body, bool &ok) {
    int status;
    const QByteArray data = send(method, path, body, status, ok);
    return QJsonDocument::fromJson(data);
}

bool ApiClient::login(const QString &username, const QString &password, QJsonObject &userOut) {
    bool ok;
    const QJsonDocument doc = call("POST", "/api/auth/login", {{"username", username}, {"password", password}}, ok);
    if (!ok) return false;
    const QJsonObject obj = doc.object();
    m_token = obj.value("token").toString();
    userOut = obj.value("user").toObject();
    return true;
}

bool ApiClient::listTenants(QJsonArray &out) {
    bool ok;
    const QJsonDocument doc = call("GET", "/api/tenants", {}, ok);
    if (!ok) return false;
    out = doc.array();
    return true;
}

bool ApiClient::createTenant(const QString &name, const QString &username, const QString &password, QJsonObject &tenantOut) {
    bool ok;
    const QJsonDocument doc = call("POST", "/api/tenants",
                                   {{"tenantName", name}, {"username", username}, {"password", password}}, ok);
    if (!ok) return false;
    tenantOut = doc.object().value("tenant").toObject();
    return true;
}

bool ApiClient::updateTenant(const QString &id, const QString &name, QJsonObject &tenantOut) {
    bool ok;
    const QJsonDocument doc = call("PUT", "/api/tenants/" + id, {{"name", name}}, ok);
    if (!ok) return false;
    tenantOut = doc.object().value("tenant").toObject();
    return true;
}

bool ApiClient::requestBackup(const QString &id, QJsonObject &out) {
    bool ok;
    const QJsonDocument doc = call("POST", "/api/tenants/" + id + "/backup/request", {}, ok);
    if (!ok) return false;
    out = doc.object();
    return true;
}

bool ApiClient::downloadBackup(const QString &id, QByteArray &bytes) {
    int status; bool ok;
    bytes = send("GET", "/api/tenants/" + id + "/backup", {}, status, ok);
    return ok;
}

bool ApiClient::listItems(QJsonArray &out) {
    bool ok;
    const QJsonDocument doc = call("GET", "/api/items", {}, ok);
    if (!ok) return false;
    out = doc.array();
    return true;
}

bool ApiClient::createItem(const QJsonObject &body, QJsonObject &out) {
    bool ok;
    const QJsonDocument doc = call("POST", "/api/items", body, ok);
    if (!ok) return false;
    out = doc.object();
    return true;
}

bool ApiClient::updateItem(const QString &id, const QJsonObject &body, QJsonObject &out) {
    bool ok;
    const QJsonDocument doc = call("PUT", "/api/items/" + id, body, ok);
    if (!ok) return false;
    out = doc.object();
    return true;
}

bool ApiClient::deleteItem(const QString &id) {
    bool ok;
    call("DELETE", "/api/items/" + id, {}, ok);
    return ok;
}

bool ApiClient::moveStock(const QString &id, int delta, const QString &note, QJsonObject &out) {
    bool ok;
    const QJsonDocument doc = call("POST", "/api/items/" + id + "/stock", {{"delta", delta}, {"note", note}}, ok);
    if (!ok) return false;
    out = doc.object();
    return true;
}

bool ApiClient::listPurchases(QJsonArray &out) {
    bool ok;
    const QJsonDocument doc = call("GET", "/api/purchases", {}, ok);
    if (!ok) return false;
    out = doc.array();
    return true;
}

bool ApiClient::createPurchase(const QJsonObject &body, QJsonObject &out) {
    bool ok;
    const QJsonDocument doc = call("POST", "/api/purchases", body, ok);
    if (!ok) return false;
    out = doc.object();
    return true;
}

bool ApiClient::deletePurchase(const QString &id) {
    bool ok;
    call("DELETE", "/api/purchases/" + id, {}, ok);
    return ok;
}

bool ApiClient::listRentals(QJsonArray &out) {
    bool ok;
    const QJsonDocument doc = call("GET", "/api/rentals", {}, ok);
    if (!ok) return false;
    out = doc.array();
    return true;
}

bool ApiClient::createRental(const QJsonObject &body, QJsonObject &out) {
    bool ok;
    const QJsonDocument doc = call("POST", "/api/rentals", body, ok);
    if (!ok) return false;
    out = doc.object();
    return true;
}

bool ApiClient::deleteRental(const QString &id) {
    bool ok;
    call("DELETE", "/api/rentals/" + id, {}, ok);
    return ok;
}

bool ApiClient::listMovements(QJsonArray &out) {
    bool ok;
    const QJsonDocument doc = call("GET", "/api/movements", {}, ok);
    if (!ok) return false;
    out = doc.array();
    return true;
}
