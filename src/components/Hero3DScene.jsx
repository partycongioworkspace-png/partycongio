function Hero3DScene({ tiltX = 0, tiltY = 0 }) {
  const sceneStyle = {
    transform: `rotateX(${10 + tiltY * 6}deg) rotateY(${tiltX * 28}deg)`,
  }

  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="scene-3d" style={sceneStyle}>
        <div className="ring ring-one" />
        <div className="ring ring-two" />
        <div className="ring ring-three" />
        <div className="scene-card scene-card-main">
          <p>Zante Ticket Pulse</p>
          <span>Referral tracked flow</span>
        </div>
        <div className="scene-card scene-card-mini">
          <p>Top events 2026</p>
        </div>
        <div className="scene-card scene-card-dot">
          <p>Live</p>
        </div>
      </div>
    </div>
  )
}

export default Hero3DScene
