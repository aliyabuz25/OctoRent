import { MENUS } from "../../constants/navigation.js";

export default function MenuBar() {
  return (
    <ul role="menubar" className="can-hover app-menubar">
      {MENUS.map((menu) => (
        <li key={menu.label} role="menuitem" tabIndex={0} aria-haspopup="true">
          {menu.label}
          <ul role="menu">
            {menu.items.map((item, index) =>
              item ? (
                <li key={item[0]} role="menuitem">
                  <a href={`#${item[0]}`} onClick={(event) => event.preventDefault()}>
                    {item[0]}
                    {item[1] && <span>{item[1]}</span>}
                  </a>
                </li>
              ) : (
                <li key={`sep-${index}`} className="has-divider" role="menuitem">
                  <a href="#sep" onClick={(event) => event.preventDefault()}>
                    &nbsp;
                  </a>
                </li>
              )
            )}
          </ul>
        </li>
      ))}
    </ul>
  );
}
