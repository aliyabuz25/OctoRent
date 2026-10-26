#include "titlebar.h"
#include "theme.h"

#include <QHBoxLayout>
#include <QLabel>
#include <QMouseEvent>
#include <QSet>
#include <QToolButton>

static QSet<TitleBar *> g_bars;

TitleBar::TitleBar(QWidget *target, const QString &title, QWidget *parent)
    : QWidget(parent), m_target(target) {
    g_bars.insert(this);

    auto *lay = new QHBoxLayout(this);
    lay->setContentsMargins(8, 0, 0, 0);
    lay->setSpacing(0);

    m_icon = new QLabel(this);
    m_icon->setFixedSize(12, 12);
    lay->addWidget(m_icon, 0, Qt::AlignVCenter);
    lay->addSpacing(8);

    m_title = new QLabel(title, this);
    m_title->setAlignment(Qt::AlignVCenter);
    lay->addWidget(m_title, 0, Qt::AlignVCenter);

    m_extras = new QHBoxLayout();
    m_extras->setContentsMargins(0, 0, 0, 0);
    m_extras->setSpacing(2);
    lay->addSpacing(14);
    lay->addLayout(m_extras);
    lay->addStretch(1);

    auto makeBtn = [this](const QString &glyph) {
        auto *b = new QToolButton(this);
        b->setFixedSize(46, 29);
        b->setAutoRaise(false);
        b->setText(glyph);
        b->setFocusPolicy(Qt::NoFocus);
        b->setCursor(Qt::ArrowCursor);
        b->setToolButtonStyle(Qt::ToolButtonTextOnly);
        return b;
    };

    m_min = makeBtn(QStringLiteral("—"));
    m_max = makeBtn(QStringLiteral("□"));
    m_close = makeBtn(QStringLiteral("✕"));

    lay->addWidget(m_min, 0, Qt::AlignTop);
    lay->addWidget(m_max, 0, Qt::AlignTop);
    lay->addWidget(m_close, 0, Qt::AlignTop);
    setFixedHeight(30);

    connect(m_min, &QToolButton::clicked, m_target, &QWidget::showMinimized);
    connect(m_max, &QToolButton::clicked, this, &TitleBar::toggleMax);
    connect(m_close, &QToolButton::clicked, m_target, &QWidget::close);

    restyle();
}

TitleBar::~TitleBar() { g_bars.remove(this); }

void TitleBar::setTitle(const QString &text) { m_title->setText(text); }

void TitleBar::toggleMax() {
    if (m_target->isMaximized()) {
        m_target->showNormal();
        m_max->setText(QStringLiteral("□"));
    } else {
        m_target->showMaximized();
        m_max->setText(QStringLiteral("❐"));
    }
}

void TitleBar::restyle() {
    const bool dark = Theme::isDark();
    const QString bg = dark ? "#1f1f1f" : "#eef0f3";
    const QString border = dark ? "#2b2b2b" : "#c8cdd4";
    const QString fg = dark ? "#d6d6d6" : "#1f2933";
    const QString hover = dark ? "#2d2d2d" : "#e5f1fb";
    const QString pressed = dark ? "#3a3a3a" : "#cce4f7";

    setStyleSheet(QStringLiteral("TitleBar{background-color:%1;border-bottom:1px solid %2;}").arg(bg, border));
    m_icon->setStyleSheet(QStringLiteral("background-color:%1;border-radius:2px;").arg(dark ? "#5c9fdd" : "#2f6cb0"));
    m_title->setStyleSheet(QStringLiteral("background:transparent;color:%1;").arg(fg));

    const QString base = QStringLiteral("QToolButton{border:none;background:transparent;color:%1;}"
                                        "QToolButton:hover{background:%2;}"
                                        "QToolButton:pressed{background:%3;}")
                             .arg(fg, hover, pressed);
    m_min->setStyleSheet(base);
    m_max->setStyleSheet(base);
    m_close->setStyleSheet(QStringLiteral("QToolButton{border:none;background:transparent;color:%1;}"
                                          "QToolButton:hover{background:#e81123;color:#ffffff;}"
                                          "QToolButton:pressed{background:#c50f1f;color:#ffffff;}").arg(fg));
}

void TitleBar::restyleAll() {
    for (TitleBar *b : g_bars)
        b->restyle();
}

void TitleBar::mousePressEvent(QMouseEvent *e) {
    if (e->button() != Qt::LeftButton) return;
    if (m_target->isMaximized()) {
        m_target->showNormal();
        m_max->setText(QStringLiteral("□"));
    }
    m_dragging = true;
    m_pressGlobal = e->globalPosition().toPoint();
    m_startWin = m_target->pos();
}

void TitleBar::mouseMoveEvent(QMouseEvent *e) {
    if (!m_dragging || !(e->buttons() & Qt::LeftButton)) return;
    const QPoint delta = e->globalPosition().toPoint() - m_pressGlobal;
    m_target->move(m_startWin + delta);
}

void TitleBar::mouseReleaseEvent(QMouseEvent *) { m_dragging = false; }

void TitleBar::mouseDoubleClickEvent(QMouseEvent *e) {
    if (e->button() == Qt::LeftButton) toggleMax();
}
