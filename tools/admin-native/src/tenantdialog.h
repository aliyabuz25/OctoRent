#ifndef TENANTDIALOG_H
#define TENANTDIALOG_H

#include <QDialog>

class QLineEdit;

class TenantDialog : public QDialog {
    Q_OBJECT
public:
    explicit TenantDialog(bool editMode, const QString &initialName, QWidget *parent = nullptr);

    QString name() const;
    QString username() const;
    QString password() const;

private:
    bool m_editMode;
    QLineEdit *m_name;
    QLineEdit *m_username;
    QLineEdit *m_password;
};

#endif // TENANTDIALOG_H
