import { useState } from 'react'
import { AMBIENTES, fotoAmbiente, tipologiaDoProjeto, type Tipologia } from '../dados/ambientes'
import type { Projeto } from '../motor/tipos'

/** Ilustração usada quando a foto não carrega (sem internet ou bloqueada). */
function Ilustracao({ tipologia }: { tipologia: Tipologia }) {
  return (
    <span className="imagem-ilustracao">
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M0 70 L40 52 H120 L160 70 V100 H0z" fill="#d9cdbd" />
        <path d="M40 0 V52 H120 V0" fill="#efe7dc" />
        <path d="M0 0 L40 0 V52 L0 70z" fill="#e3d8c9" />
        <path d="M160 0 L120 0 V52 L160 70z" fill="#e3d8c9" />
        <rect x={60} y={30} width={40} height={6} rx={3} fill="#e0523e" opacity={0.8} />
      </svg>
      <span>{AMBIENTES[tipologia].nome}</span>
    </span>
  )
}

export function ImagemAmbiente({ tipologia, imagem, largura = 640, alt }: { tipologia: Tipologia; imagem?: string; largura?: number; alt: string }) {
  const [falhou, setFalhou] = useState(false)
  const src = imagem || fotoAmbiente(tipologia, largura)
  return (
    <span className="imagem-ambiente">
      {src && !falhou ? <img src={src} alt={alt} loading="lazy" onError={() => setFalhou(true)} /> : <Ilustracao tipologia={tipologia} />}
    </span>
  )
}

export function ImagemProjeto({ projeto, largura }: { projeto: Projeto; largura?: number }) {
  return <ImagemAmbiente tipologia={tipologiaDoProjeto(projeto)} imagem={projeto.imagem} largura={largura} alt={`Imagem do projeto ${projeto.nome}`} />
}
