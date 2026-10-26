#include "mainwindow.h"
#include "apiclient.h"
#include "tenantdialog.h"
#include "backupinspectordialog.h"
#include "tenantworkspace.h"
#include "connectionconfig.h"
#include "titlebar.h"
#include "frameless.h"

#include <QApplication>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileDialog>
#include <QFormLayout>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QJsonObject>
#include <QLabel>
#include <QLineEdit>
#include <QMessageBox>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>

static QString fmtDate(const QString &iso) {
    if (iso.isEmpty()) return "—";
    const QDateTime dt = QDateTime::fromString(iso, Qt::ISODateWithMs);
    if (!dt.isValid()) return iso;
    return dt.toLocalTime().toString("dd.MM.yyyy HH:mm");
}

MainWindow::MainWindow(const QString &configPath, QWidget *parent)
    : QMainWindow(parent), m_configPath(configPath) {
    m_api = new ApiClient(this);
    m_cfg = loadConnectionConfig(m_configPath);
    buildUi();
    setConnected(false);
    if (!m_cfg.username.isEmpty() && !m_cfg.password.isEmpty())
        onConnect();
    else
        warn("connection.conf tapılmadı və ya istifadəçi/şifrə boşdur.\nFayl: connection.conf");
}

void MainWindow::buildUi() {
    setWindowTitle("RunStock — Admin (Markalar)");
    resize(920, 560);
    Frameless::install(this);

    auto *central = new QWidget(this);
    auto *root = new QVBoxLayout(central);
    root->setContentsMargins(0, 0, 0, 0);
    root->setSpacing(0);

    auto *titleBar = new TitleBar(this, "RunStock — Admin (Markalar)", central);
    root->addWidget(titleBar);

    m_table = new QTableWidget(central);
    m_table->setColumnCount(6);
    m_table->setHorizontalHeaderLabels({"Marka", "İstifadəçi", "Adminlər", "Yaradılma", "Son backup", "ID"});
    m_table->setEditTriggers(QAbstractItemView::NoEditTriggers);
    m_table->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_table->setSelectionMode(QAbstractItemView::SingleSelection);
    m_table->horizontalHeader()->setStretchLastSection(true);
    m_table->verticalHeader()->setVisible(false);

    auto *content = new QWidget(central);
    auto *cl = new QVBoxLayout(content);
    cl->setContentsMargins(8, 6, 8, 6);
    cl->setSpacing(6);
    cl->addWidget(m_table, 1);

    auto *actions = new QHBoxLayout();
    m_createBtn = new QPushButton("Yeni marka", content);
    m_editBtn = new QPushButton("Redaktə et", content);
    m_openBtn = new QPushButton("İdarə et", content);
    m_downloadBtn = new QPushButton("Backup talep & endir", content);
    m_inspectBtn = new QPushButton("Backup incele", content);
    m_refreshBtn = new QPushButton("Yenilə", content);
    m_connectBtn = new QPushButton("Yenidən qoşul", content);
    actions->addWidget(m_createBtn);
    actions->addWidget(m_editBtn);
    actions->addWidget(m_openBtn);
    actions->addWidget(m_downloadBtn);
    actions->addWidget(m_inspectBtn);
    actions->addStretch();
    actions->addWidget(m_connectBtn);
    actions->addWidget(m_refreshBtn);
    cl->addLayout(actions);

    m_status = new QLabel("Qoşulma gözlənilir...", content);
    m_status->setStyleSheet("color:#52606d;");
    cl->addWidget(m_status);

    root->addWidget(content, 1);
    setCentralWidget(central);

    connect(m_connectBtn, &QPushButton::clicked, this, &MainWindow::onConnect);
    connect(m_refreshBtn, &QPushButton::clicked, this, &MainWindow::onRefresh);
    connect(m_createBtn, &QPushButton::clicked, this, &MainWindow::onCreate);
    connect(m_editBtn, &QPushButton::clicked, this, &MainWindow::onEdit);
    connect(m_openBtn, &QPushButton::clicked, this, &MainWindow::onOpen);
    connect(m_downloadBtn, &QPushButton::clicked, this, &MainWindow::onDownloadBackup);
    connect(m_inspectBtn, &QPushButton::clicked, this, &MainWindow::onInspectBackup);
    connect(m_table, &QTableWidget::itemSelectionChanged, this, [this]() { setConnected(m_connected); });
    connect(m_table, &QTableWidget::doubleClicked, this, [this](const QModelIndex &) { onOpen(); });
}

void MainWindow::setConnected(bool on) {
    m_connected = on;
    m_refreshBtn->setEnabled(on);
    m_createBtn->setEnabled(on);
    const bool hasSel = on && selectedRow() >= 0;
    m_editBtn->setEnabled(hasSel);
    m_openBtn->setEnabled(hasSel);
    m_downloadBtn->setEnabled(hasSel);
    m_inspectBtn->setEnabled(true);
}

void MainWindow::setBusy(bool busy) {
    m_connectBtn->setEnabled(!busy);
    m_refreshBtn->setEnabled(!busy);
    m_createBtn->setEnabled(!busy);
    m_editBtn->setEnabled(!busy);
    m_openBtn->setEnabled(!busy);
    m_downloadBtn->setEnabled(!busy);
    if (busy) QApplication::setOverrideCursor(Qt::WaitCursor);
    else QApplication::restoreOverrideCursor();
}

void MainWindow::info(const QString &msg) { m_status->setText(msg); }

void MainWindow::warn(const QString &msg, const QString &title) {
    QMessageBox::warning(this, title, msg);
    info(msg);
}

int MainWindow::selectedRow() const {
    const auto ranges = m_table->selectedRanges();
    if (ranges.isEmpty()) return -1;
    return ranges.first().topRow();
}

QString MainWindow::selectedTenantId() const {
    const int r = selectedRow();
    if (r < 0) return {};
    QTableWidgetItem *item = m_table->item(r, 5);
    return item ? item->text() : QString();
}

QString MainWindow::selectedTenantName() const {
    const int r = selectedRow();
    if (r < 0) return {};
    QTableWidgetItem *item = m_table->item(r, 0);
    return item ? item->text() : QString();
}

void MainWindow::onConnect() {
    m_cfg = loadConnectionConfig(m_configPath);
    if (m_cfg.username.isEmpty() || m_cfg.password.isEmpty()) {
        warn("connection.conf tapılmadı və ya istifadəçi/şifrə boşdur.\nFayl: connection.conf");
        setConnected(false);
        return;
    }
    setBusy(true);
    m_api->setBaseUrl(m_cfg.url);
    QJsonObject user;
    if (!m_api->login(m_cfg.username, m_cfg.password, user)) {
        setBusy(false);
        warn("Giriş alınmadı: " + m_api->lastError());
        setConnected(false);
        return;
    }
    if (user.value("role").toString() != "superadmin") {
        setBusy(false);
        warn("Bu alət yalnız sistem admini (superadmin) üçündür.");
        setConnected(false);
        return;
    }
    info(QString("Bağlandı: %1 (%2)").arg(user.value("name").toString(), user.value("username").toString()));
    setBusy(false);
    setConnected(true);
    onRefresh();
}

void MainWindow::onRefresh() {
    setBusy(true);
    QJsonArray tenants;
    const bool ok = m_api->listTenants(tenants);
    if (!ok) {
        setBusy(false);
        warn("Markalar alınmadı: " + m_api->lastError());
        return;
    }
    m_tenants = tenants;
    m_table->setSortingEnabled(false);
    m_table->setRowCount(tenants.size());
    for (int i = 0; i < tenants.size(); ++i) {
        const QJsonObject t = tenants.at(i).toObject();
        const QJsonArray adminsArr = t.value("admins").toArray();
        QStringList admins;
        for (const auto &a : adminsArr) admins << a.toString();
        const QStringList cells = {
            t.value("name").toString(),
            QString::number(t.value("userCount").toInt()),
            admins.join(", "),
            fmtDate(t.value("createdAt").toString()),
            fmtDate(t.value("lastBackup").toString()),
            t.value("id").toString()
        };
        for (int c = 0; c < cells.size(); ++c)
            m_table->setItem(i, c, new QTableWidgetItem(cells.at(c)));
    }
    m_table->setSortingEnabled(true);
    setBusy(false);
    setConnected(true);
    info(QString("%1 marka yüklendi.").arg(tenants.size()));
}

void MainWindow::onCreate() {
    TenantDialog dlg(false, QString(), this);
    if (dlg.exec() != QDialog::Accepted) return;
    if (dlg.name().isEmpty() || dlg.username().isEmpty() || dlg.password().size() < 4) {
        warn("Marka adı, istifadəçi adı və ən azı 4 simvollu şifrə tələb olunur.");
        return;
    }
    setBusy(true);
    QJsonObject tenant;
    const bool ok = m_api->createTenant(dlg.name(), dlg.username().toLower(), dlg.password(), tenant);
    setBusy(false);
    if (!ok) {
        warn("Marka yaradılmadı: " + m_api->lastError());
        return;
    }
    info("Marka yaradıldı: " + dlg.name());
    onRefresh();
}

void MainWindow::onEdit() {
    const QString id = selectedTenantId();
    if (id.isEmpty()) {
        warn("Əvvəlcə marka seçin.");
        return;
    }
    TenantDialog dlg(true, selectedTenantName(), this);
    if (dlg.exec() != QDialog::Accepted) return;
    if (dlg.name().isEmpty()) {
        warn("Marka adı tələb olunur.");
        return;
    }
    setBusy(true);
    QJsonObject tenant;
    const bool ok = m_api->updateTenant(id, dlg.name(), tenant);
    setBusy(false);
    if (!ok) {
        warn("Yenilənmədi: " + m_api->lastError());
        return;
    }
    info("Marka yeniləndi: " + dlg.name());
    onRefresh();
}

void MainWindow::onOpen() {
    const QString id = selectedTenantId();
    if (id.isEmpty()) {
        warn("Əvvəlcə marka seçin.");
        return;
    }
    auto *ws = new TenantWorkspace(id, selectedTenantName(), m_api->baseUrl(), m_api->token());
    ws->show();
    info("İdarə pəncərəsi açıldı: " + selectedTenantName());
}

void MainWindow::onDownloadBackup() {
    const QString id = selectedTenantId();
    const QString name = selectedTenantName();
    if (id.isEmpty()) {
        warn("Əvvəlcə marka seçin.");
        return;
    }
    if (QMessageBox::question(this, "Backup", QString("\"%1\" üçün backup talep edilsin və endirilsin?").arg(name))
        != QMessageBox::Yes)
        return;

    const QString suggested = QDir::homePath() + "/" + QString("runstock-backup-%1.json").arg(name.left(24));
    const QString path = QFileDialog::getSaveFileName(this, "Backup faylını saxla", suggested, "JSON (*.json)");
    if (path.isEmpty()) return;

    setBusy(true);
    QJsonObject req;
    if (!m_api->requestBackup(id, req)) {
        setBusy(false);
        warn("Backup sorğusu alınmadı: " + m_api->lastError());
        return;
    }
    QByteArray bytes;
    const bool ok = m_api->downloadBackup(id, bytes);
    setBusy(false);
    if (!ok) {
        warn("Backup endirilə bilmədi: " + m_api->lastError());
        return;
    }
    QFile file(path);
    if (!file.open(QIODevice::WriteOnly)) {
        warn("Fayl yazıla bilmədi: " + path);
        return;
    }
    file.write(bytes);
    file.close();
    info(QString("Backup saxlandı: %1 (%2 bayt)").arg(path).arg(bytes.size()));
    QMessageBox::information(this, "Backup", "Backup uğurla saxlandı:\n" + path);
    onRefresh();
}

void MainWindow::onInspectBackup() {
    const QString path = QFileDialog::getOpenFileName(this, "Backup faylını seç", QDir::homePath(), "JSON (*.json)");
    if (path.isEmpty()) return;
    BackupInspectorDialog dlg(path, this);
    dlg.exec();
}
