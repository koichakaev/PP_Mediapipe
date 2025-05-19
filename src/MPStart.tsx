import { useRef, useEffect, useState } from 'react'
import Webcam from 'react-webcam'
import { Holistic } from '@mediapipe/holistic'
import { Camera } from '@mediapipe/camera_utils'

const hitSound = new Audio('/hi.mp3')
const failSound = new Audio('/fai.mp3')

const MPStart = () => {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const headRef = useRef({ x: 0, y: 0 })
  const scoreRef = useRef(0)
  const [visibleScore, setVisibleScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [isGameOver, setIsGameOver] = useState(false)
  const [highScore, setHighScore] = useState(
    Number(localStorage.getItem('highScore')) || 0
  )

  const ballRef = useRef({
    x: Math.random() * 640,
    y: -20,
    radius: 20,
    speedY: 4,
  })

  const justHitRef = useRef(false)

  const resetGame = () => {
    scoreRef.current = 0
    setVisibleScore(0)
    setLives(3)
    setIsGameOver(false)
    ballRef.current.y = -20
    ballRef.current.x = Math.random() * 640
    ballRef.current.speedY = 4
  }

  const onResults = (results: any) => {
    if (results.poseLandmarks && results.poseLandmarks[0]) {
      const nose = results.poseLandmarks[0]
      headRef.current = {
        x: (1 - nose.x) * 640,
        y: nose.y * 480,
      }
    }
  }

  useEffect(() => {
    let animationFrameId: number

    const update = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx || isGameOver) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (webcamRef.current?.video) {
        ctx.save()
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(webcamRef.current.video, 0, 0, canvas.width, canvas.height)
        ctx.restore()
      }

      const ball = ballRef.current
      ball.y += ball.speedY

      const dx = ball.x - headRef.current.x
      const dy = ball.y - headRef.current.y
      const distanceSq = dx * dx + dy * dy
      const hitRadius = (ball.radius + 15) ** 2

      if (distanceSq < hitRadius) {
        if (!justHitRef.current) {
          scoreRef.current++
          justHitRef.current = true
          hitSound.currentTime = 0
          hitSound.play()

          if (scoreRef.current > highScore) {
            localStorage.setItem('highScore', String(scoreRef.current))
            setHighScore(scoreRef.current)
          }

          ball.y = -20
          ball.x = Math.random() * 640
        }
      } else {
        justHitRef.current = false
      }

      if (ball.y > 480) {
        failSound.currentTime = 0
        failSound.play()

        setLives(prev => {
          const newLives = prev - 1
          if (newLives <= 0) {
            setIsGameOver(true)
          }
          return newLives
        })

        ball.y = -20
        ball.x = Math.random() * 640
      }

      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      ctx.fillStyle = 'black'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius / 1.5, 0, Math.PI * 2)
      ctx.fillStyle = 'yellow'
      ctx.fill()
      ctx.closePath()

      animationFrameId = requestAnimationFrame(update)
    }

    update()
    return () => cancelAnimationFrame(animationFrameId)
  }, [isGameOver])

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleScore(scoreRef.current)
    }, 200)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const holistic = new Holistic({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    })

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    holistic.onResults(onResults)

    let camera: Camera | null = null
    if (webcamRef.current?.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          await holistic.send({ image: webcamRef.current!.video! })
        },
        width: 640,
        height: 480,
      })
      camera.start()
    }

    return () => {
      camera?.stop()
      holistic.close()
    }
  }, [])

  const renderLives = () => '❤️'.repeat(lives) + '🖤'.repeat(3 - lives)

return (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100vw',
    height: '100vh',
    background: 'url(/background.png) no-repeat center center / cover',
  }}>

      <div style={{
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: '20px',
        borderRadius: '20px',
        boxShadow: '0 0 20px rgba(0,0,0,0.3)',
      }}>
        <p style={{ fontSize: 24 }}>
          Очки: {visibleScore} ⭐ | Жизни: {renderLives()} | Рекорд: {highScore} 🏆
        </p>
        {isGameOver && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}>
            <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>Игра окончена!</h1>
            <p style={{ fontSize: '24px', marginBottom: '30px' }}>Ваш счёт: {visibleScore}</p>
            <p style={{ fontSize: '20px', marginBottom: '30px' }}>Рекорд: {highScore}</p>
            <button onClick={resetGame} style={{ fontSize: 20, padding: '12px 24px', cursor: 'pointer' }}>
              Перезапустить
            </button>
          </div>
        )}
        <canvas ref={canvasRef} width={640} height={480} />
        <Webcam ref={webcamRef} mirrored={false} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

export default MPStart
