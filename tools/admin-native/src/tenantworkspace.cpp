#include "tenantworkspace.h"
#include "apiclient.h"
#include "itemdialog.h"
#include "documentdialog.h"
#include "titlebar.h"
#include "frameless.h"

#include <QAbstractItemView>
#include <QApplication>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QInputDialog>
#include <QJsonObject>
#include <QJsonValue>
#include <QLabel>
#include <QMessageBox>
#include <QPushButton>
#include <QTabWidget>
#include <QTableWidget>
#include <QVBoxLayout>

static QTableWidget *makeTable(const QStringList &headers, QWidget *parent) {
    auto *t = new QTableWidget(parent);
    t->setColumnCount(headers.size());
    t->setHorizontalHeaderLabels(headers);
    t->setEditTriggers(QAbstractItemView::NoEditTriggers);
    t->setSelectionBehavior(QAbstractItemView::SelectRows);
    t->setSelectionMode(QAbstractItemView::SingleSelection);
    t->horizontalHeader()->setStretchLastSection(true);
    t->verticalHeader()->setVisible(false);
    return t;
}

static QString money(double v) { return QString::number(v, 'f', 2); }

TenantWorkspace::TenantWorkspace(const QString &tenantId, const QString &tenantName,
                                 const QString &baseUrl, const QString &token, QWidget *parent)
    : QWidget(parent, Qt::Window) {
    setAttribute(Qt::WA_DeleteOnClose);
    setWindowTitle(QString("RunStock — %1").arg(tenantName));
    resize(980, 620);
    Frameless::install(this);

    m_api = new ApiClient(this);
    m_api->setBaseUrl(baseUrl);
    m_api->setToken(token);
    m_api->setActAsTenant(tenantId);

    auto *root = new QVBoxLayout(this);
    root->setContentsMargins(0, 0, 0, 0);
    root->setSpacing(0);

    auto *titleBar = new TitleBar(this, QString("RunStock — %1").arg(tenantName), this);
    root->addWidget(titleBar);

    auto *content = new QWidget(this);
    auto *cl = new QVBoxLayout(content);
    cl->setContentsMargins(8, 6, 8, 6);
    cl->setSpacing(6);
    root->addWidget(content, 1);

    auto *title = new QLabel(QString("<b>%1</b>").arg(tenantName.toHtmlEscaped()), content);
    cl->addWidget(title);

    m_tabs = new QTabWidget(content);
    cl->addWidget(m_tabs, 1);

    /* ---- Stok ---- */
    auto *stockTab = new QWidget(this);
    auto *stockLayout = new QVBoxLayout(stockTab);
    auto *stockBar = new QHBoxLayout();
    auto *newItemBtn = new QPushButton("Yeni məhsul", stockTab);
    auto *editItemBtn = new QPushButton("Redaktə et", stockTab);
    auto *delItemBtn = new QPushButton("Sil", stockTab);
    auto *stockMoveBtn = new QPushButton("Stok + / -", stockTab);
    auto *refreshItemsBtn = new QPushButton("Yenilə", stockTab);
    stockBar->addWidget(newItemBtn);
    stockBar->addWidget(editItemBtn);
    stockBar->addWidget(delItemBtn);
    stockBar->addWidget(stockMoveBtn);
    stockBar->addStretch();
    stockBar->addWidget(refreshItemsBtn);
    stockLayout->addLayout(stockBar);
    m_itemsTable = makeTable({"SKU", "Ad", "Kateqoriya", "Miqdar", "Min", "Qiymət", "Maya", "Yerləşmə"}, stockTab);
    stockLayout->addWidget(m_itemsTable, 1);
    m_tabs->addTab(stockTab, "Stok");

    /* ---- Alım ---- */
    auto *purchaseTab = new QWidget(this);
    auto *purchaseLayout = new QVBoxLayout(purchaseTab);
    auto *purchaseBar = new QHBoxLayout();
    auto *newPurchaseBtn = new QPushButton("Yeni alış", purchaseTab);
    auto *delPurchaseBtn = new QPushButton("Sil", purchaseTab);
    auto *refreshPurchaseBtn = new QPushButton("Yenilə", purchaseTab);
    purchaseBar->addWidget(newPurchaseBtn);
    purchaseBar->addWidget(delPurchaseBtn);
    purchaseBar->addStretch();
    purchaseBar->addWidget(refreshPurchaseBtn);
    purchaseLayout->addLayout(purchaseBar);
    m_purchases = makeTable({"İstinad", "Tədarükçü", "Status", "Tarix", "Cəmi", "Sətir"}, purchaseTab);
    purchaseLayout->addWidget(m_purchases, 1);
    m_tabs->addTab(purchaseTab, "Alım");

    /* ---- Kiralama ---- */
    auto *rentalTab = new QWidget(this);
    auto *rentalLayout = new QVBoxLayout(rentalTab);
    auto *rentalBar = new QHBoxLayout();
    auto *newRentalBtn = new QPushButton("Yeni kiralama", rentalTab);
    auto *delRentalBtn = new QPushButton("Sil", rentalTab);
    auto *refreshRentalBtn = new QPushButton("Yenilə", rentalTab);
    rentalBar->addWidget(newRentalBtn);
    rentalBar->addWidget(delRentalBtn);
    rentalBar->addStretch();
    rentalBar->addWidget(refreshRentalBtn);
    rentalLayout->addLayout(rentalBar);
    m_rentals = makeTable({"İstinad", "Müştəri", "Status", "Tarix", "Cəmi", "Sətir"}, rentalTab);
    rentalLayout->addWidget(m_rentals, 1);
    m_tabs->addTab(rentalTab, "Kiralama");

    /* ---- Hərəkatlar ---- */
    auto *moveTab = new QWidget(this);
    auto *moveLayout = new QVBoxLayout(moveTab);
    auto *moveBar = new QHBoxLayout();
    auto *refreshMoveBtn = new QPushButton("Yenilə", moveTab);
    moveBar->addStretch();
    moveBar->addWidget(refreshMoveBtn);
    moveLayout->addLayout(moveBar);
    m_movements = makeTable({"Tip", "SKU", "Miqdar", "Sonrakı", "Tarix", "Qeyd"}, moveTab);
    moveLayout->addWidget(m_movements, 1);
    m_tabs->addTab(moveTab, "Hərəkatlar");

    m_status = new QLabel("Hazır", this);
    root->addWidget(m_status);

    connect(newItemBtn, &QPushButton::clicked, this, &TenantWorkspace::createItem);
    connect(editItemBtn, &QPushButton::clicked, this, &TenantWorkspace::editItem);
    connect(delItemBtn, &QPushButton::clicked, this, &TenantWorkspace::deleteItem);
    connect(stockMoveBtn, &QPushButton::clicked, this, &TenantWorkspace::moveStock);
    connect(refreshItemsBtn, &QPushButton::clicked, this, &TenantWorkspace::loadItems);
    connect(m_itemsTable, &QTableWidget::doubleClicked, this, [this](const QModelIndex &) { editItem(); });

    connect(newPurchaseBtn, &QPushButton::clicked, this, &TenantWorkspace::newPurchase);
    connect(delPurchaseBtn, &QPushButton::clicked, this, &TenantWorkspace::deletePurchase);
    connect(refreshPurchaseBtn, &QPushButton::clicked, this, &TenantWorkspace::loadPurchases);

    connect(newRentalBtn, &QPushButton::clicked, this, &TenantWorkspace::newRental);
    connect(delRentalBtn, &QPushButton::clicked, this, &TenantWorkspace::deleteRental);
    connect(refreshRentalBtn, &QPushButton::clicked, this, &TenantWorkspace::loadRentals);

    connect(refreshMoveBtn, &QPushButton::clicked, this, &TenantWorkspace::loadMovements);

    refreshAll();
}

int TenantWorkspace::row(const QTableWidget *t) const {
    const auto ranges = t->selectedRanges();
    if (ranges.isEmpty()) return -1;
    return ranges.first().topRow();
}

void TenantWorkspace::setInfo(const QString &msg) { m_status->setText(msg); }

void TenantWorkspace::refreshAll() {
    loadItems();
    loadPurchases();
    loadRentals();
    loadMovements();
}

void TenantWorkspace::loadItems() {
    QJsonArray items;
    if (!m_api->listItems(items)) {
        setInfo("Məhsullar alınmadı: " + m_api->lastError());
        return;
    }
    m_items = items;
    m_itemsTable->setSortingEnabled(false);
    m_itemsTable->setRowCount(items.size());
    for (int r = 0; r < items.size(); ++r) {
        const QJsonObject o = items.at(r).toObject();
        const QStringList cols = {
            o.value("sku").toString(),
            o.value("name").toString(),
            o.value("category").toString(),
            QString::number(o.value("quantity").toInt()),
            QString::number(o.value("minStock").toInt()),
            money(o.value("price").toDouble()),
            money(o.value("cost").toDouble()),
            o.value("location").toString(),
        };
        for (int c = 0; c < cols.size(); ++c)
            m_itemsTable->setItem(r, c, new QTableWidgetItem(cols.at(c)));
    }
    m_itemsTable->setSortingEnabled(true);
    setInfo(QString("%1 məhsul").arg(items.size()));
}

void TenantWorkspace::createItem() {
    ItemDialog dlg(false, {}, this);
    if (dlg.exec() != QDialog::Accepted) return;
    const QJsonObject body = dlg.toJson();
    if (body.value("sku").toString().isEmpty() || body.value("name").toString().isEmpty()) {
        QMessageBox::warning(this, "Xəta", "SKU və Ad tələb olunur.");
        return;
    }
    QJsonObject out;
    if (!m_api->createItem(body, out)) {
        QMessageBox::warning(this, "Xəta", "Məhsul yaradılmadı: " + m_api->lastError());
        return;
    }
    loadItems();
    setInfo("Məhsul əlavə edildi.");
}

void TenantWorkspace::editItem() {
    const int r = row(m_itemsTable);
    if (r < 0) {
        QMessageBox::information(this, "Məhsul", "Əvvəlcə məhsul seçin.");
        return;
    }
    const QJsonObject cur = m_items.at(r).toObject();
    ItemDialog dlg(true, cur, this);
    if (dlg.exec() != QDialog::Accepted) return;
    QJsonObject out;
    if (!m_api->updateItem(cur.value("id").toString(), dlg.toJson(), out)) {
        QMessageBox::warning(this, "Xəta", "Yenilənmədi: " + m_api->lastError());
        return;
    }
    loadItems();
    setInfo("Məhsul yeniləndi.");
}

void TenantWorkspace::deleteItem() {
    const int r = row(m_itemsTable);
    if (r < 0) {
        QMessageBox::information(this, "Məhsul", "Əvvəlcə məhsul seçin.");
        return;
    }
    const QJsonObject cur = m_items.at(r).toObject();
    if (QMessageBox::question(this, "Sil", QString("\"%1\" silinsin?").arg(cur.value("name").toString()))
        != QMessageBox::Yes)
        return;
    if (!m_api->deleteItem(cur.value("id").toString())) {
        QMessageBox::warning(this, "Xəta", "Silinmədi: " + m_api->lastError());
        return;
    }
    loadItems();
    setInfo("Məhsul silindi.");
}

void TenantWorkspace::moveStock() {
    const int r = row(m_itemsTable);
    if (r < 0) {
        QMessageBox::information(this, "Stok", "Əvvəlcə məhsul seçin.");
        return;
    }
    const QJsonObject cur = m_items.at(r).toObject();
    bool okInt = false;
    const int delta = QInputDialog::getInt(this, "Stok hərəkəti",
                                           QString("%1 — dəyişiklik (+ / -):").arg(cur.value("name").toString()),
                                           1, -1000000, 1000000, 1, &okInt);
    if (!okInt || delta == 0) return;
    bool okStr = false;
    const QString note = QInputDialog::getText(this, "Qeyd", "Qeyd (istəyə bağlı):", QLineEdit::Normal, "", &okStr);
    QJsonObject out;
    if (!m_api->moveStock(cur.value("id").toString(), delta, note, out)) {
        QMessageBox::warning(this, "Xəta", "Stok dəyişmədi: " + m_api->lastError());
        return;
    }
    loadItems();
    loadMovements();
    setInfo(QString("Stok yeniləndi: %1").arg(delta));
}

void TenantWorkspace::loadPurchases() {
    QJsonArray list;
    if (!m_api->listPurchases(list)) {
        setInfo("Alışlar alınmadı: " + m_api->lastError());
        return;
    }
    m_purchaseData = list;
    m_purchases->setRowCount(list.size());
    for (int r = 0; r < list.size(); ++r) {
        const QJsonObject o = list.at(r).toObject();
        const int lines = o.value("items").toArray().size();
        const QStringList cols = {
            o.value("reference").toString(),
            o.value("supplier").toString(),
            o.value("status").toString(),
            o.value("date").toString(),
            money(o.value("total").toDouble()),
            QString::number(lines),
        };
        for (int c = 0; c < cols.size(); ++c)
            m_purchases->setItem(r, c, new QTableWidgetItem(cols.at(c)));
    }
}

void TenantWorkspace::newPurchase() {
    QJsonArray items;
    if (!m_api->listItems(items)) {
        QMessageBox::warning(this, "Xəta", "Məhsullar alınmadı: " + m_api->lastError());
        return;
    }
    if (items.isEmpty()) {
        QMessageBox::information(this, "Alış", "Əvvəlcə məhsul əlavə edin.");
        return;
    }
    DocumentDialog dlg("purchase", items, this);
    if (dlg.exec() != QDialog::Accepted) return;
    const QJsonObject body = dlg.toJson();
    if (body.value("supplier").toString().isEmpty() || body.value("items").toArray().isEmpty()) {
        QMessageBox::warning(this, "Xəta", "Tədarükçü və ən azı bir sətir tələb olunur.");
        return;
    }
    QJsonObject out;
    if (!m_api->createPurchase(body, out)) {
        QMessageBox::warning(this, "Xəta", "Alış yaradılmadı: " + m_api->lastError());
        return;
    }
    loadPurchases();
    loadItems();
    loadMovements();
    setInfo("Alış yaradıldı.");
}

void TenantWorkspace::deletePurchase() {
    const int r = row(m_purchases);
    if (r < 0) {
        QMessageBox::information(this, "Alış", "Əvvəlcə sənəd seçin.");
        return;
    }
    const QString id = m_purchaseData.at(r).toObject().value("id").toString();
    if (QMessageBox::question(this, "Sil", "Alış silinsin? (stok geri qaytarılacaq)") != QMessageBox::Yes)
        return;
    if (!m_api->deletePurchase(id)) {
        QMessageBox::warning(this, "Xəta", "Silinmədi: " + m_api->lastError());
        return;
    }
    loadPurchases();
    loadItems();
    loadMovements();
    setInfo("Alış silindi.");
}

void TenantWorkspace::loadRentals() {
    QJsonArray list;
    if (!m_api->listRentals(list)) {
        setInfo("Kiralamalar alınmadı: " + m_api->lastError());
        return;
    }
    m_rentalData = list;
    m_rentals->setRowCount(list.size());
    for (int r = 0; r < list.size(); ++r) {
        const QJsonObject o = list.at(r).toObject();
        const int lines = o.value("items").toArray().size();
        const QStringList cols = {
            o.value("reference").toString(),
            o.value("customer").toString(),
            o.value("status").toString(),
            o.value("date").toString(),
            money(o.value("total").toDouble()),
            QString::number(lines),
        };
        for (int c = 0; c < cols.size(); ++c)
            m_rentals->setItem(r, c, new QTableWidgetItem(cols.at(c)));
    }
}

void TenantWorkspace::newRental() {
    QJsonArray items;
    if (!m_api->listItems(items)) {
        QMessageBox::warning(this, "Xəta", "Məhsullar alınmadı: " + m_api->lastError());
        return;
    }
    if (items.isEmpty()) {
        QMessageBox::information(this, "Kiralama", "Əvvəlcə məhsul əlavə edin.");
        return;
    }
    DocumentDialog dlg("rental", items, this);
    if (dlg.exec() != QDialog::Accepted) return;
    const QJsonObject body = dlg.toJson();
    if (body.value("customer").toString().isEmpty() || body.value("items").toArray().isEmpty()) {
        QMessageBox::warning(this, "Xəta", "Müştəri və ən azı bir sətir tələb olunur.");
        return;
    }
    QJsonObject out;
    if (!m_api->createRental(body, out)) {
        QMessageBox::warning(this, "Xəta", "Kiralama yaradılmadı: " + m_api->lastError());
        return;
    }
    loadRentals();
    loadItems();
    loadMovements();
    setInfo("Kiralama yaradıldı.");
}

void TenantWorkspace::deleteRental() {
    const int r = row(m_rentals);
    if (r < 0) {
        QMessageBox::information(this, "Kiralama", "Əvvəlcə sənəd seçin.");
        return;
    }
    const QString id = m_rentalData.at(r).toObject().value("id").toString();
    if (QMessageBox::question(this, "Sil", "Kiralama silinsin? (stok geri qaytarılacaq)") != QMessageBox::Yes)
        return;
    if (!m_api->deleteRental(id)) {
        QMessageBox::warning(this, "Xəta", "Silinmədi: " + m_api->lastError());
        return;
    }
    loadRentals();
    loadItems();
    loadMovements();
    setInfo("Kiralama silindi.");
}

void TenantWorkspace::loadMovements() {
    QJsonArray list;
    if (!m_api->listMovements(list)) {
        setInfo("Hərəkatlar alınmadı: " + m_api->lastError());
        return;
    }
    m_movements->setRowCount(list.size());
    for (int r = 0; r < list.size(); ++r) {
        const QJsonObject o = list.at(r).toObject();
        const QString type = o.value("type").toString();
        const QStringList cols = {
            type == "in" ? "Giriş" : "Çıxış",
            o.value("sku").toString(),
            QString::number(o.value("qty").toInt()),
            QString::number(o.value("quantityAfter").toInt()),
            o.value("date").toString(),
            o.value("note").toString(),
        };
        for (int c = 0; c < cols.size(); ++c)
            m_movements->setItem(r, c, new QTableWidgetItem(cols.at(c)));
    }
}
