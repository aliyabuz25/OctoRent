#ifndef TITLEBAR_H
#define TITLEBAR_H

#include <QPoint>
#include <QWidget>

class QLabel;
class QToolButton;
class QHBoxLayout;

class TitleBar : public QWidget {
    Q_OBJECT
public:
    TitleBar(QWidget *target, const QString &title, QWidget *parent = nullptr);
    ~TitleBar() override;

    void setTitle(const QString &text);
    QHBoxLayout *extras() const { return m_extras; }

    void restyle();
    static void restyleAll();

protected:
    void mousePressEvent(QMouseEvent *e) override;
    void mouseMoveEvent(QMouseEvent *e) override;
    void mouseReleaseEvent(QMouseEvent *e) override;
    void mouseDoubleClickEvent(QMouseEvent *e) override;

private:
    void toggleMax();

    QWidget *m_target;
    QLabel *m_icon;
    QLabel *m_title;
    QToolButton *m_min;
    QToolButton *m_max;
    QToolButton *m_close;
    QHBoxLayout *m_extras;
    QPoint m_pressGlobal;
    QPoint m_startWin;
    bool m_dragging = false;
};

#endif // TITLEBAR_H
