export default function Sidebar({ tabs, activeTab, onSelect }) {
  return (
    <div className="object-explorer">
      <div className="oe-title">Nesneler</div>
      <div className="oe-body">
        <ul className="tree-view has-collapse-button has-connector has-container oe-tree">
          <li>
            <details open>
              <summary>Stockix</summary>
              <ul>
                {tabs.map((tab) => (
                  <li
                    key={tab.id}
                    className={`oe-item${tab.id === activeTab ? " selected" : ""}`}
                    onClick={() => onSelect(tab.id)}
                  >
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
