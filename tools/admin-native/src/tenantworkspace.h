#ifndef TENANTWORKSPACE_H
#define TENANTWORKSPACE_H

#include <QWidget>
#include <QJsonArray>

class QTableWidget;
class QLabel;
class QTabWidget;
class ApiClient;

class TenantWorkspace : public QWidget {
    Q_OBJECT
public:
    TenantWorkspace(const QString &tenantId, const QString &tenantName,
                    const QString &baseUrl, const QString &token, QWidget *parent = nullptr);

private slots:
    void refreshAll();
    void loadItems();
    void createItem();
    void editItem();
    void deleteItem();
    void moveStock();
    void loadPurchases();
    void newPurchase();
    void deletePurchase();
    void loadRentals();
    void newRental();
    void deleteRental();
    void loadMovements();

private:
    int row(const QTableWidget *t) const;
    void setInfo(const QString &msg);

    ApiClient *m_api;
    QString m_tenantName;
    QTabWidget *m_tabs;
    QLabel *m_status;

    QTableWidget *m_itemsTable;
    QJsonArray m_items;
    QTableWidget *m_purchases;
    QJsonArray m_purchaseData;
    QTableWidget *m_rentals;
    QJsonArray m_rentalData;
    QTableWidget *m_movements;
};

#endif // TENANTWORKSPACE_H
