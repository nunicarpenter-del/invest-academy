'use client'

import { MapPin, ExternalLink } from 'lucide-react'

interface Props {
  address: string
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export default function PropertyMap({ address }: Props) {
  const encodedAddress = encodeURIComponent(address)
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`

  return (
    <div className="overflow-hidden rounded-xl border border-[#2C3B38]">
      {API_KEY ? (
        <iframe
          title={`Map for ${address}`}
          width="100%"
          height="200"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${encodedAddress}&zoom=15`}
        />
      ) : (
        <a
          href={mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[120px] items-center justify-center gap-2 bg-[#101A26] text-sm text-[#86968B] transition-colors hover:text-[#C8AA8F]"
        >
          <MapPin size={16} className="text-[#C8AA8F]" />
          <span className="truncate max-w-[200px]">{address}</span>
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}
