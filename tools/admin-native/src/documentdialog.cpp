#include "documentdialog.h"
#include "titlebar.h"
#include "frameless.h"

#include <QComboBox>
#include <QDate>
#include <QDateEdit>
#include <QDialogButtonBox>
#include <QDoubleSpinBox>
#include <QAbstractItemView>
#include <QFormLayout>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QSpinBox>
#include <QTableWidget>
#include <QVBoxLayout>

DocumentDialog::DocumentDialog(const QString &kind, const QJsonArray &items, QWidget *parent)
    : QDialog(parent), m_kind(kind), m_items(items) {
    const bool purchase = (kind == "purchase");
    setWindowTitle(purchase ? "Yeni alış" : "Yeni kiralama");
    setModal(true);
    resize(680, 520);
    Frameless::install(this);

    auto *outer = new QVBoxLayout(this);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(0);
    outer->addWidget(new TitleBar(this, purchase ? "Yeni alış" : "Yeni kiralama", this));
    auto *content = new QWidget(this);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(16, 12, 16, 12);
    layout->setSpacing(10);
    outer->addWidget(content, 1);
    auto *form = new QFormLayout();

    m_reference = new QLineEdit(this);
    m_reference->setPlaceholderText(purchase ? "AL-0001" : "KIR-0001");
    m_partner = new QLineEdit(this);
    m_partner->setPlaceholderText(purchase ? "Tədarükçü adı" : "Müştəri adı");

    m_status = new QComboBox(this);
    if (purchase) {
        m_status->addItem("Qaralama (stoka təsir etmir)", "draft");
        m_status->addItem("Qəbul edildi (stok +)", "received");
        m_status->addItem("Ödənildi (stok +)", "paid");
    } else {
        m_status->addItem("Qaralama (stoka təsir etmir)", "draft");
        m_status->addItem("Təsdiqləndi (stok -)", "confirmed");
        m_status->addItem("Aktiv (stok -)", "active");
        m_status->addItem("Qaytarıldı", "returned");
    }

    m_date = new QDateEdit(QDate::currentDate(), this);
    m_date->setCalendarPopup(true);
    m_date->setDisplayFormat("yyyy-MM-dd");

    m_note = new QLineEdit(this);

    form->addRow("İstinad No", m_reference);
    form->addRow(purchase ? "Tədarükçü *" : "Müştəri *", m_partner);
    form->addRow("Status", m_status);
    form->addRow("Tarix", m_date);
    form->addRow("Qeyd", m_note);
    layout->addLayout(form);

    layout->addWidget(new QLabel("Sətirlər:", this));
    m_lines = new QTableWidget(this);
    m_lines->setColumnCount(4);
    m_lines->setHorizontalHeaderLabels({"Məhsul", "Miqdar", "Qiymət", "Cəmi"});
    m_lines->horizontalHeader()->setSectionResizeMode(0, QHeaderView::Stretch);
    m_lines->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_lines->setEditTriggers(QAbstractItemView::NoEditTriggers);
    layout->addWidget(m_lines, 1);

    auto *lineButtons = new QHBoxLayout();
    auto *addBtn = new QPushButton("Sətir əlavə et", this);
    auto *delBtn = new QPushButton("Sətri sil", this);
    lineButtons->addWidget(addBtn);
    lineButtons->addWidget(delBtn);
    lineButtons->addStretch();
    layout->addLayout(lineButtons);

    m_total = new QLabel("Cəmi: 0.00", this);
    layout->addWidget(m_total);

    auto *buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    buttons->button(QDialogButtonBox::Ok)->setText("Yadda saxla");
    buttons->button(QDialogButtonBox::Cancel)->setText("Ləğv et");
    connect(buttons, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    layout->addWidget(buttons);

    connect(addBtn, &QPushButton::clicked, this, &DocumentDialog::addRow);
    connect(delBtn, &QPushButton::clicked, this, &DocumentDialog::removeRow);

    addRow();
}

void DocumentDialog::addRow() {
    const int row = m_lines->rowCount();
    m_lines->insertRow(row);

    auto *combo = new QComboBox(m_lines);
    for (const QJsonValue &v : m_items) {
        const QJsonObject it = v.toObject();
        combo->addItem(QString("%1 — %2").arg(it.value("sku").toString(), it.value("name").toString()), it.value("id").toVariant());
    }
    m_lines->setCellWidget(row, 0, combo);

    auto *qty = new QSpinBox(m_lines);
    qty->setMinimum(1);
    qty->setMaximum(1000000);
    qty->setValue(1);
    m_lines->setCellWidget(row, 1, qty);

    auto *price = new QDoubleSpinBox(m_lines);
    price->setMaximum(100000000);
    price->setDecimals(2);
    m_lines->setCellWidget(row, 2, price);

    auto *total = new QLabel("0.00", m_lines);
    total->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
    m_lines->setCellWidget(row, 3, total);

    auto setDefaultPrice = [this, combo, price]() {
        const int idx = combo->currentIndex();
        if (idx < 0) return;
        const QJsonObject it = m_items.at(idx).toObject();
        const double def = (m_kind == "purchase") ? it.value("cost").toDouble() : it.value("price").toDouble();
        price->setValue(def);
    };
    setDefaultPrice();

    connect(combo, QOverload<int>::of(&QComboBox::currentIndexChanged), this, [this, setDefaultPrice](int) {
        setDefaultPrice();
        recalcTotals();
    });
    connect(qty, QOverload<int>::of(&QSpinBox::valueChanged), this, [this](int) { recalcTotals(); });
    connect(price, QOverload<double>::of(&QDoubleSpinBox::valueChanged), this, [this](double) { recalcTotals(); });

    recalcTotals();
}

void DocumentDialog::removeRow() {
    const int row = m_lines->currentRow();
    if (row < 0) return;
    m_lines->removeRow(row);
    recalcTotals();
}

void DocumentDialog::recalcTotals() {
    double sum = 0;
    for (int r = 0; r < m_lines->rowCount(); ++r) {
        auto *qty = qobject_cast<QSpinBox *>(m_lines->cellWidget(r, 1));
        auto *price = qobject_cast<QDoubleSpinBox *>(m_lines->cellWidget(r, 2));
        auto *total = qobject_cast<QLabel *>(m_lines->cellWidget(r, 3));
        const double t = (qty ? qty->value() : 0) * (price ? price->value() : 0);
        if (total) total->setText(QString::number(t, 'f', 2));
        sum += t;
    }
    m_total->setText(QString("Cəmi: %1").arg(sum, 0, 'f', 2));
}

QJsonObject DocumentDialog::toJson() const {
    QJsonArray lines;
    double sum = 0;
    for (int r = 0; r < m_lines->rowCount(); ++r) {
        auto *combo = qobject_cast<QComboBox *>(m_lines->cellWidget(r, 0));
        auto *qty = qobject_cast<QSpinBox *>(m_lines->cellWidget(r, 1));
        auto *price = qobject_cast<QDoubleSpinBox *>(m_lines->cellWidget(r, 2));
        if (!combo || combo->currentIndex() < 0) continue;
        const QJsonObject it = m_items.at(combo->currentIndex()).toObject();
        const int q = qty ? qty->value() : 0;
        const double p = price ? price->value() : 0;
        const double t = q * p;
        sum += t;
        lines.append(QJsonObject{
            {"itemId", it.value("id")},
            {"sku", it.value("sku")},
            {"name", it.value("name")},
            {"qty", q},
            {"price", p},
            {"total", t},
        });
    }

    QJsonObject body{
        {"reference", m_reference->text().trimmed()},
        {"status", m_status->currentData().toString()},
        {"date", m_date->date().toString("yyyy-MM-dd")},
        {"note", m_note->text().trimmed()},
        {"items", lines},
        {"total", sum},
    };
    if (m_kind == "purchase")
        body.insert("supplier", m_partner->text().trimmed());
    else
        body.insert("customer", m_partner->text().trimmed());
    return body;
}
