#ifndef BACKUPINSPECTORDIALOG_H
#define BACKUPINSPECTORDIALOG_H

#include <QDialog>
#include <QJsonObject>

class QComboBox;
class QLabel;
class QTableWidget;

class BackupInspectorDialog : public QDialog {
    Q_OBJECT
public:
    explicit BackupInspectorDialog(const QString &filePath, QWidget *parent = nullptr);

private slots:
    void showCollection(const QString &name);

private:
    QJsonObject m_data;
    QComboBox *m_collection;
    QTableWidget *m_table;
    QLabel *m_summary;
};

#endif // BACKUPINSPECTORDIALOG_H
