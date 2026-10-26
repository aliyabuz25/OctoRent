#include "backupinspectordialog.h"
#include "titlebar.h"
#include "frameless.h"

#include <QComboBox>
#include <QDialogButtonBox>
#include <QFile>
#include <QHeaderView>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonValue>
#include <QLabel>
#include <QAbstractItemView>
#include <QSet>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>

static QString valueToString(const QJsonValue &v) {
    if (v.isString()) return v.toString();
    if (v.isDouble()) return QString::number(v.toDouble());
    if (v.isBool()) return v.toBool() ? "true" : "false";
    if (v.isNull() || v.isUndefined()) return "";
    if (v.isArray()) return QString::fromUtf8(QJsonDocument(v.toArray()).toJson(QJsonDocument::Compact));
    return QString::fromUtf8(QJsonDocument(v.toObject()).toJson(QJsonDocument::Compact));
}

static const QStringList &fieldOrder() {
    static const QStringList order = {
        "id", "name", "sku", "itemName", "reference", "type", "status", "quantity",
        "quantityAfter", "qty", "price", "cost", "total", "category", "brand", "supplier",
        "customer", "username", "role", "date", "at", "createdAt", "updated", "note"
    };
    return order;
}

BackupInspectorDialog::BackupInspectorDialog(const QString &filePath, QWidget *parent)
    : QDialog(parent) {
    setWindowTitle("Backup incelemesi");
    setModal(true);
    resize(820, 520);
    Frameless::install(this);

    QJsonObject backup;
    QString error;
    QFile file(filePath);
    if (!file.open(QIODevice::ReadOnly)) {
        error = "Fayl açıla bilmədi: " + filePath;
    } else {
        QJsonParseError parseError;
        const QJsonDocument doc = QJsonDocument::fromJson(file.readAll(), &parseError);
        if (parseError.error != QJsonParseError::NoError || !doc.isObject()) {
            error = "JSON oxuna bilmədi: " + parseError.errorString();
        } else {
            backup = doc.object();
        }
    }

    auto *outer = new QVBoxLayout(this);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(0);
    outer->addWidget(new TitleBar(this, "Backup incelemesi", this));
    auto *content = new QWidget(this);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(14, 10, 14, 10);
    layout->setSpacing(8);
    outer->addWidget(content, 1);
    m_summary = new QLabel(this);
    m_summary->setTextInteractionFlags(Qt::TextSelectableByMouse);
    m_summary->setWordWrap(true);
    layout->addWidget(m_summary);

    if (!error.isEmpty()) {
        m_summary->setText("<b>Xəta</b><br>" + error.toHtmlEscaped());
        auto *close = new QDialogButtonBox(QDialogButtonBox::Close, this);
        connect(close, &QDialogButtonBox::rejected, this, &QDialog::reject);
        layout->addWidget(close);
        return;
    }

    const QJsonObject tenant = backup.value("tenant").toObject();
    const QJsonObject counts = backup.value("counts").toObject();
    m_data = backup.value("data").toObject();

    QString summary = QString("<b>%1</b><br>")
                          .arg(tenant.value("name").toString("(adsız)").toHtmlEscaped());
    summary += QString("Marka ID: %1<br>").arg(tenant.value("id").toString().toHtmlEscaped());
    summary += QString("Yaradılma tarixi: %1<br>").arg(backup.value("generatedAt").toString().toHtmlEscaped());
    summary += QString("Versiya: %1").arg(backup.value("version").toInt());
    m_summary->setText(summary);

    auto *row = new QHBoxLayout();
    row->addWidget(new QLabel("Kolleksiya:", this));
    m_collection = new QComboBox(this);
    for (const QString &key : m_data.keys()) {
        const int count = counts.value(key).toInt(m_data.value(key).toArray().size());
        m_collection->addItem(QString("%1 (%2)").arg(key).arg(count), key);
    }
    row->addWidget(m_collection);
    row->addStretch();
    layout->addLayout(row);

    m_table = new QTableWidget(this);
    m_table->setEditTriggers(QAbstractItemView::NoEditTriggers);
    m_table->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_table->horizontalHeader()->setStretchLastSection(true);
    layout->addWidget(m_table);

    auto *buttons = new QDialogButtonBox(QDialogButtonBox::Close, this);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    layout->addWidget(buttons);

    connect(m_collection, &QComboBox::currentTextChanged,
            this, [this](const QString &) { showCollection(m_collection->currentData().toString()); });

    if (m_collection->count() > 0)
        showCollection(m_collection->currentData().toString());
}

void BackupInspectorDialog::showCollection(const QString &name) {
    const QJsonArray rows = m_data.value(name).toArray();

    QSet<QString> keys;
    for (const QJsonValue &rv : rows) {
        const QJsonObject obj = rv.toObject();
        for (const QString &k : obj.keys()) keys.insert(k);
    }

    QStringList columns;
    for (const QString &k : fieldOrder())
        if (keys.contains(k)) columns << k;
    for (const QString &k : keys)
        if (!columns.contains(k)) columns << k;

    m_table->clear();
    m_table->setColumnCount(columns.size());
    m_table->setHorizontalHeaderLabels(columns);
    m_table->setRowCount(rows.size());

    for (int r = 0; r < rows.size(); ++r) {
        const QJsonObject obj = rows.at(r).toObject();
        for (int c = 0; c < columns.size(); ++c) {
            auto *item = new QTableWidgetItem(valueToString(obj.value(columns.at(c))));
            m_table->setItem(r, c, item);
        }
    }
    m_table->resizeColumnsToContents();
}
