#include "tenantdialog.h"
#include "titlebar.h"
#include "frameless.h"

#include <QDialogButtonBox>
#include <QFormLayout>
#include <QLineEdit>
#include <QPushButton>
#include <QVBoxLayout>

TenantDialog::TenantDialog(bool editMode, const QString &initialName, QWidget *parent)
    : QDialog(parent), m_editMode(editMode) {
    setWindowTitle(editMode ? "Markanı redaktə et" : "Yeni marka");
    setModal(true);
    setMinimumWidth(360);
    Frameless::install(this);

    auto *outer = new QVBoxLayout(this);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(0);
    outer->addWidget(new TitleBar(this, editMode ? "Markanı redaktə et" : "Yeni marka", this));
    auto *content = new QWidget(this);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(16, 12, 16, 12);
    layout->setSpacing(10);
    outer->addWidget(content, 1);
    auto *form = new QFormLayout();

    m_name = new QLineEdit(initialName, this);
    m_name->setPlaceholderText("Məs: Nümunə Mağaza");
    form->addRow("Marka adı", m_name);

    if (!editMode) {
        m_username = new QLineEdit(this);
        m_username->setPlaceholderText("admin");
        form->addRow("Admin istifadəçi adı", m_username);

        m_password = new QLineEdit(this);
        m_password->setEchoMode(QLineEdit::Password);
        m_password->setPlaceholderText("Ən azı 4 simvol");
        form->addRow("Şifrə", m_password);
    } else {
        m_username = nullptr;
        m_password = nullptr;
    }

    layout->addLayout(form);

    auto *buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    buttons->button(QDialogButtonBox::Ok)->setText(editMode ? "Yadda saxla" : "Yarat");
    buttons->button(QDialogButtonBox::Cancel)->setText("Ləğv et");
    connect(buttons, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    layout->addWidget(buttons);
}

QString TenantDialog::name() const { return m_name->text().trimmed(); }
QString TenantDialog::username() const { return m_username ? m_username->text().trimmed() : QString(); }
QString TenantDialog::password() const { return m_password ? m_password->text() : QString(); }
