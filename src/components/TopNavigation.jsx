function TopNavigation({ brand, links, onOpenModal }) {
  return (
    <nav className="topbar">
      <p className="brand">
        <span>{brand.split(' ')[0]}</span> {brand.split(' ').slice(1).join(' ')}
      </p>
      <div className="menu-links">
        {links.map((link) => {
          if (link.href) {
            return (
              <a key={link.key} href={link.href}>
                {link.label}
              </a>
            )
          }

          return (
            <button key={link.key} type="button" onClick={() => onOpenModal(link.action)}>
              {link.label}
            </button>
          )
        })}
      </div>
      <div className="mobile-links">
        <button type="button" onClick={() => onOpenModal('events')}>
          Eventi
        </button>
        <button type="button" onClick={() => onOpenModal('soldout')}>
          Sold Out
        </button>
        <a href="#contatti">Contatti</a>
      </div>
    </nav>
  )
}

export default TopNavigation
