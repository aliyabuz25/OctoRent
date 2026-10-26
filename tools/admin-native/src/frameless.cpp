#include "frameless.h"

#include <QAbstractButton>
#include <QApplication>
#include <QEvent>
#include <QMouseEvent>
#include <QSet>
#include <QWidget>

namespace {

const int kEdgeMargin = 6;

enum Edge { ENone = 0, ELeft = 1, ERight = 2, ETop = 4, EBottom = 8 };

int edgeAt(const QPoint &g, const QRect &r) {
    int e = ENone;
    if (g.x() <= r.left() + kEdgeMargin) e |= ELeft;
    else if (g.x() >= r.right() - kEdgeMargin) e |= ERight;
    if (g.y() <= r.top() + kEdgeMargin) e |= ETop;
    else if (g.y() >= r.bottom() - kEdgeMargin) e |= EBottom;
    return e;
}

Qt::CursorShape cursorFor(int e) {
    if ((e & ELeft && e & ETop) || (e & ERight && e & EBottom)) return Qt::SizeFDiagCursor;
    if ((e & ERight && e & ETop) || (e & ELeft && e & EBottom)) return Qt::SizeBDiagCursor;
    if (e & (ELeft | ERight)) return Qt::SizeHorCursor;
    return Qt::SizeVerCursor;
}

class Filter : public QObject {
public:
    bool eventFilter(QObject *obj, QEvent *ev) override {
        auto *w = qobject_cast<QWidget *>(obj);
        if (!w) return false;
        if (qobject_cast<QAbstractButton *>(w)) return false;

        QWidget *win = w->window();
        if (!win || !m_managed.contains(win)) return false;
        if (win->isMaximized()) return false;

        const auto type = ev->type();
        const QRect r = win->geometry();
        const QPoint gp = QCursor::pos();

        if (m_resizing && type == QEvent::MouseMove) {
            const QPoint d = gp - m_start;
            QRect ng = m_startGeom;
            if (m_edge & ELeft) ng.setLeft(ng.left() + d.x());
            if (m_edge & ERight) ng.setRight(ng.right() + d.x());
            if (m_edge & ETop) ng.setTop(ng.top() + d.y());
            if (m_edge & EBottom) ng.setBottom(ng.bottom() + d.y());

            QSize minS = win->minimumSizeHint();
            if (!minS.isValid() || minS.width() < 360) minS.setWidth(360);
            if (!minS.isValid() || minS.height() < 240) minS.setHeight(240);
            if (ng.width() < minS.width()) {
                if (m_edge & ELeft) ng.setLeft(ng.right() - minS.width());
                else ng.setWidth(minS.width());
            }
            if (ng.height() < minS.height()) {
                if (m_edge & ETop) ng.setTop(ng.bottom() - minS.height());
                else ng.setHeight(minS.height());
            }
            win->setGeometry(ng);
            return true;
        }

        if (m_resizing && type == QEvent::MouseButtonRelease) {
            m_resizing = false;
            win->releaseMouse();
            w->unsetCursor();
            return true;
        }

        if (type == QEvent::MouseMove) {
            const int e = edgeAt(gp, r);
            if (e) w->setCursor(cursorFor(e));
            else w->unsetCursor();
            return false;
        }

        if (type == QEvent::MouseButtonPress) {
            auto *me = static_cast<QMouseEvent *>(ev);
            if (me->button() != Qt::LeftButton) return false;
            const int e = edgeAt(gp, r);
            if (!e) return false;
            m_resizing = true;
            m_edge = e;
            m_start = gp;
            m_startGeom = r;
            win->grabMouse();
            return true;
        }

        return false;
    }

    void add(QWidget *w) { m_managed.insert(w); }

private:
    QSet<QWidget *> m_managed;
    bool m_resizing = false;
    int m_edge = ENone;
    QPoint m_start;
    QRect m_startGeom;
};

Filter *filter() {
    static Filter *f = nullptr;
    if (!f) {
        f = new Filter();
        qApp->installEventFilter(f);
    }
    return f;
}

} // namespace

void Frameless::install(QWidget *window) {
    window->setWindowFlag(Qt::FramelessWindowHint);
    filter()->add(window);
}
