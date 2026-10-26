#include "itemdialog.h"
#include "titlebar.h"
#include "frameless.h"

#include <QDialogButtonBox>
#include <QDoubleSpinBox>
#include <QFormLayout>
#include <QLineEdit>
#include <QPushButton>
#include <QSpinBox>
#include <QVBoxLayout>

static double num(const QJsonObject &o, const QString &k) { return o.value(k).toDouble(); }
static QString str(const QJsonObject &o, const QString &k) { return o.value(k).toString(); }

ItemDialog::ItemDialog(bool editMode, const QJsonObject &initial, QWidget *parent)
    : QDialog(parent) {
    setWindowTitle(editMode ? "Məhsulu redaktə et" : "Yeni məhsul");
    setModal(true);
    setMinimumWidth(420);
    Frameless::install(this);

    auto *outer = new QVBoxLayout(this);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(0);
    outer->addWidget(new TitleBar(this, editMode ? "Məhsulu redaktə et" : "Yeni məhsul", this));
    auto *content = new QWidget(this);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(16, 12, 16, 12);
    layout->setSpacing(10);
    outer->addWidget(content, 1);
    auto *form = new QFormLayout();

    m_sku = new QLineEdit(str(initial, "sku"), this);
    m_name = new QLineEdit(str(initial, "name"), this);
    m_category = new QLineEdit(str(initial, "category"), this);
    m_brand = new QLineEdit(str(initial, "brand"), this);
    m_unit = new QLineEdit(str(initial, "unit"), this);
    m_unit->setText(initial.contains("unit") ? str(initial, "unit") : "Adet");

    m_price = new QDoubleSpinBox(this);
    m_price->setMaximum(100000000);
    m_price->setDecimals(2);
    m_price->setValue(num(initial, "price"));

    m_cost = new QDoubleSpinBox(this);
    m_cost->setMaximum(100000000);
    m_cost->setDecimals(2);
    m_cost->setValue(num(initial, "cost"));

    m_minStock = new QSpinBox(this);
    m_minStock->setMaximum(100000000);
    m_minStock->setValue(initial.contains("minStock") ? initial.value("minStock").toInt() : 5);

    m_quantity = new QSpinBox(this);
    m_quantity->setMaximum(100000000);
    m_quantity->setValue(initial.value("quantity").toInt());

    m_location = new QLineEdit(str(initial, "location"), this);
    m_supplier = new QLineEdit(str(initial, "supplier"), this);
    m_description = new QLineEdit(str(initial, "description"), this);

    form->addRow("SKU *", m_sku);
    form->addRow("Ad *", m_name);
    form->addRow("Kateqoriya", m_category);
    form->addRow("Marka", m_brand);
    form->addRow("Vahid", m_unit);
    form->addRow("Satış qiyməti", m_price);
    form->addRow("Maya", m_cost);
    form->addRow("Min. stok", m_minStock);
    form->addRow("Miqdar", m_quantity);
    form->addRow("Yerləşmə", m_location);
    form->addRow("Tədarükçü", m_supplier);
    form->addRow("Təsvir", m_description);

    layout->addLayout(form);

    auto *buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    buttons->button(QDialogButtonBox::Ok)->setText("Yadda saxla");
    buttons->button(QDialogButtonBox::Cancel)->setText("Ləğv et");
    connect(buttons, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    layout->addWidget(buttons);
}

QJsonObject ItemDialog::toJson() const {
    return QJsonObject{
        {"sku", m_sku->text().trimmed()},
        {"name", m_name->text().trimmed()},
        {"category", m_category->text().trimmed()},
        {"brand", m_brand->text().trimmed()},
        {"unit", m_unit->text().trimmed()},
        {"price", m_price->value()},
        {"cost", m_cost->value()},
        {"minStock", m_minStock->value()},
        {"quantity", m_quantity->value()},
        {"location", m_location->text().trimmed()},
        {"supplier", m_supplier->text().trimmed()},
        {"description", m_description->text().trimmed()},
    };
}
