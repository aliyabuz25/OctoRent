#ifndef DOCUMENTDIALOG_H
#define DOCUMENTDIALOG_H

#include <QDialog>
#include <QJsonArray>
#include <QJsonObject>

class QComboBox;
class QDateEdit;
class QLineEdit;
class QLabel;
class QTableWidget;

class DocumentDialog : public QDialog {
    Q_OBJECT
public:
    // kind: "purchase" or "rental"
    explicit DocumentDialog(const QString &kind, const QJsonArray &items, QWidget *parent = nullptr);

    QJsonObject toJson() const;

private slots:
    void addRow();
    void removeRow();
    void recalcTotals();

private:
    QString m_kind;
    QJsonArray m_items;
    QLineEdit *m_reference;
    QLineEdit *m_partner;
    QComboBox *m_status;
    QDateEdit *m_date;
    QLineEdit *m_note;
    QTableWidget *m_lines;
    QLabel *m_total;
};

#endif // DOCUMENTDIALOG_H
