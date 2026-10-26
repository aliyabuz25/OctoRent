#ifndef THEME_H
#define THEME_H

#include <QString>

namespace Theme {
void apply(const QString &key);
void save(const QString &key);
QString saved();
QString current();
bool isDark();
} // namespace Theme

#endif // THEME_H
