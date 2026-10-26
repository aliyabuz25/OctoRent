#ifndef ITEMDIALOG_H
#define ITEMDIALOG_H

#include <QDialog>
#include <QJsonObject>

class QLineEdit;
class QDoubleSpinBox;
class QSpinBox;

class ItemDialog : public QDialog {
    Q_OBJECT
public:
    explicit ItemDialog(bool editMode, const QJsonObject &initial, QWidget *parent = nullptr);

    QJsonObject toJson() const;

private:
    QLineEdit *m_sku;
    QLineEdit *m_name;
    QLineEdit *m_category;
    QLineEdit *m_brand;
    QLineEdit *m_unit;
    QDoubleSpinBox *m_price;
    QDoubleSpinBox *m_cost;
    QSpinBox *m_minStock;
    QSpinBox *m_quantity;
    QLineEdit *m_location;
    QLineEdit *m_supplier;
    QLineEdit *m_description;
};

#endif // ITEMDIALOG_H
