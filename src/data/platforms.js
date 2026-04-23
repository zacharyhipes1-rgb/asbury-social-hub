export const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    lightBg: '#EBF2FD',
    contentTypes: [
      { id: 'single_image',     name: 'Single Image',     icon: 'Image'    },
      { id: 'video',            name: 'Video',            icon: 'Video'    },
      { id: 'carousel',         name: 'Carousel',         icon: 'Layout'   },
      { id: 'text_post',        name: 'Text Post',        icon: 'Type'     },
      { id: 'event_promotion',  name: 'Event Promotion',  icon: 'Calendar' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    lightBg: '#FDEEF4',
    contentTypes: [
      { id: 'reel',             name: 'Reel',             icon: 'Video'    },
      { id: 'carousel',         name: 'Carousel',         icon: 'Layout'   },
      { id: 'single_image',     name: 'Single Image',     icon: 'Image'    },
      { id: 'stories',          name: 'Stories',          icon: 'Circle'   },
      { id: 'text_caption',     name: 'Text Caption',     icon: 'Type'     },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#010101',
    lightBg: '#F0F0F0',
    contentTypes: [
      { id: 'video',            name: 'Video',            icon: 'Video'    },
      { id: 'carousel',         name: 'Carousel',         icon: 'Layout'   },
      { id: 'trending_sounds',  name: 'Trending Sounds',  icon: 'Music'    },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    lightBg: '#E8F1FB',
    contentTypes: [
      { id: 'carousel_pdf',     name: 'Carousel / PDF',   icon: 'FileText' },
      { id: 'article',          name: 'Article',          icon: 'BookOpen' },
      { id: 'video',            name: 'Video',            icon: 'Video'    },
      { id: 'text_update',      name: 'Text Update',      icon: 'Type'     },
      { id: 'document',         name: 'Document',         icon: 'File'     },
    ],
  },
]

export const getPlatform = (id) => PLATFORMS.find(p => p.id === id)

export const getContentType = (platformId, contentTypeId) => {
  const platform = getPlatform(platformId)
  return platform?.contentTypes.find(ct => ct.id === contentTypeId)
}
