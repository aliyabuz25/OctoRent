export default function Sidebar({ tabs, activeTab, onSelect }) {
  return (
    <div className="object-explorer">
      <div className="oe-title">Modullar</div>
      <div className="oe-body">
        <ul className="tree-view has-collapse-button has-connector has-container oe-tree">
          <li>
            <details open>
              <summary>Əsas</summary>
              <ul>
                {tabs.filter(t => ["dashboard","stock","movements","audit"].includes(t.id)).map((tab) => (
                  <li key={tab.id} className={`oe-item${tab.id === activeTab ? " selected" : ""}`} onClick={() => onSelect(tab.id)}>
                    <span className="oe-object-icon" />
                    {tab.label}
                  </li>
                ))}
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Kataloq</summary>
              <ul>
                {tabs.filter(t => ["categories","brands"].includes(t.id)).map((tab) => (
                  <li key={tab.id} className={`oe-item${tab.id === activeTab ? " selected" : ""}`} onClick={() => onSelect(tab.id)}>
                    <span className="oe-object-icon" />
                    {tab.label}
                  </li>
                ))}
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Partnyorlar</summary>
              <ul>
                {tabs.filter(t => ["suppliers","customers"].includes(t.id)).map((tab) => (
                  <li key={tab.id} className={`oe-item${tab.id === activeTab ? " selected" : ""}`} onClick={() => onSelect(tab.id)}>
                    <span className="oe-object-icon" />
                    {tab.label}
                  </li>
                ))}
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Anbar & Sənədlər</summary>
              <ul>
                {tabs.filter(t => ["warehouses","purchases","sales"].includes(t.id)).map((tab) => (
                  <li key={tab.id} className={`oe-item${tab.id === activeTab ? " selected" : ""}`} onClick={() => onSelect(tab.id)}>
                    <span className="oe-object-icon" />
                    {tab.label}
                  </li>
                ))}
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Hesabat & Parametrlər</summary>
              <ul>
                {tabs.filter(t => ["reports","settings"].includes(t.id)).map((tab) => (
                  <li key={tab.id} className={`oe-item${tab.id === activeTab ? " selected" : ""}`} onClick={() => onSelect(tab.id)}>
                    <span className="oe-object-icon" />
                    {tab.label}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  );
}
