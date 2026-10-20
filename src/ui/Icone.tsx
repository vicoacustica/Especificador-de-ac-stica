// Ícones de traço (24×24), no estilo dos botões em pílula da interface.
const CAMINHOS = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  projetos: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  materiais: 'M12 3 3 7.5l9 4.5 9-4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  ajuda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  usuario: 'M20 21a8 8 0 1 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mais: 'M12 5v14M5 12h14',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'olho-fechado': 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  busca: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  voltar: 'M19 12H5M12 19l-7-7 7-7',
  seta: 'M7 17 17 7M7 7h10v10',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  lixo: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  editar: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  enviar: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  imagem: 'M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 19',
  ok: 'M20 6 9 17l-5-5',
  fechar: 'M18 6 6 18M6 6l12 12',
  ambiente: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9',
  superficies: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6',
  ocupacao: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  comparar: 'M3 3v18h18M7 15l4-4 3 3 6-7',
  documento: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  livro: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  calculo: 'M5 3h14v18H5zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  onda: 'M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0',
  copiarTexto: 'M8 4h10a2 2 0 0 1 2 2v12M4 8h10a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2z',
  nuvem: 'M3 9h18M5 9v-3M19 9V6M7 13h10l-1.5 5h-7z',
  raios: 'M4 20h.01M4 20 20 8M4 20l9-15M4 20l16 0M13 5l7 3',
  borracha: 'M7 21h13M5.5 14.5l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 20H8l-2.5-2.5a2.1 2.1 0 0 1 0-3zM9 11l6 6',
  sol: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  lua: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  paleta: 'M12 21a9 9 0 1 1 9-9c0 2-1.6 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.4.5.5 1 .3 1.6-.3.7-1.6 1.1-2.8 1.1zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01M17.5 11.5h.01',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  lista: 'M4 5h4v4H4zM4 15h4v4H4zM11 7h9M11 17h9',
  regua: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
} as const

export type NomeIcone = keyof typeof CAMINHOS

export function Icone({ nome, tamanho = 18 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg className="icone" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={CAMINHOS[nome]} />
    </svg>
  )
}
