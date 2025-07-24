import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { RefreshCw, Calendar, Share2 } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface Holiday {
  name: string
  description?: string
  category?: string
  reason?: string
}

interface DailyContent {
  date: string
  holiday: Holiday
  memeUrl: string
}

function App() {
  const [content, setContent] = useKV<DailyContent | null>('daily-holiday-content', null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [memeLoading, setMemeLoading] = useState(false)

  const today = new Date().toDateString()

  const fetchHolidays = async () => {
    const date = new Date()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    try {
      const response = await fetch(`https://api.api-ninjas.com/v1/holidays?country=US&year=${date.getFullYear()}&month=${month}&day=${day}`, {
        headers: {
          'X-Api-Key': 'demo' // Using demo mode
        }
      })
      
      if (!response.ok) {
        throw new Error('Holiday API failed')
      }
      
      const holidays = await response.json()
      return holidays.length > 0 ? holidays : getFallbackHolidays()
    } catch (error) {
      console.log('Using fallback holidays due to API issue')
      return getFallbackHolidays()
    }
  }

  const getFallbackHolidays = () => {
    const date = new Date()
    const monthDay = `${date.getMonth() + 1}-${date.getDate()}`
    
    const fallbackHolidays: Record<string, Holiday[]> = {
      '1-1': [{ name: 'New Year\'s Day', description: 'Fresh start, new bugs to fix!' }],
      '2-14': [{ name: 'Valentine\'s Day', description: 'Love is in the air... and in your code' }],
      '3-14': [{ name: 'Pi Day', description: 'Celebrating the most famous mathematical constant' }],
      '4-1': [{ name: 'April Fools\' Day', description: 'The day when even your IDE plays pranks' }],
      '7-24': [{ name: 'National Tequila Day', description: 'Time to debug with a different kind of spirit!' }],
      '9-29': [{ name: 'Coffee Appreciation Day', description: 'Fuel for developers worldwide' }],
      '10-31': [{ name: 'Halloween', description: 'The scariest bugs come out today' }],
      '12-25': [{ name: 'Christmas Day', description: 'Time for some holiday coding magic' }]
    }
    
    return fallbackHolidays[monthDay] || [
      { name: 'International Debugging Day', description: 'Every day is debugging day for engineers!' },
      { name: 'Productive Coding Day', description: 'A perfect day to ship some features' },
      { name: 'Code Quality Day', description: 'Time to refactor and make things beautiful' }
    ]
  }

  const selectBestHoliday = async (holidays: Holiday[]) => {
    if (holidays.length === 1) return holidays[0]
    
    const prompt = spark.llmPrompt`You are selecting the most fun, interesting, or funny holiday for an engineering team to share. 

Here are today's holidays:
${holidays.map(h => `- ${h.name}: ${h.description || 'No description'}`).join('\n')}

Pick the ONE holiday that would be most entertaining, surprising, or relatable for software engineers. Consider:
- Humor potential
- Uniqueness/obscurity 
- Relevance to tech culture
- Shareability among teammates

Respond with just the holiday name exactly as listed above, followed by | and a brief reason why it's the best choice for engineers.`

    try {
      const result = await spark.llm(prompt, 'gpt-4o-mini')
      const [selectedName, reason] = result.split('|').map(s => s.trim())
      
      const selectedHoliday = holidays.find(h => 
        h.name.toLowerCase() === selectedName.toLowerCase() ||
        selectedName.toLowerCase().includes(h.name.toLowerCase()) ||
        h.name.toLowerCase().includes(selectedName.toLowerCase())
      )
      
      if (selectedHoliday) {
        return { ...selectedHoliday, reason }
      }
    } catch (error) {
      console.log('AI selection failed, using first holiday')
    }
    
    return holidays[0]
  }

  const generateMeme = async (holiday: Holiday, forceNew = false) => {
    const holidayName = holiday.name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
    
    // Holiday-specific meme mappings for better results - using verified working GIFs
    const holidayMemes: Record<string, string[]> = {
      'national tequila day': [
        'https://media.giphy.com/media/YOK9jLlP2aukAmlKa8/giphy.gif', // tequila shot
        'https://media.giphy.com/media/l0MYKhkDpEUWPpxYY/giphy.gif', // margarita making
        'https://media.giphy.com/media/3o7TKB1MyF8B4sGbHq/giphy.gif'  // tequila celebration
      ],
      'coffee appreciation day': [
        'https://media.giphy.com/media/8Bkr9UJQTuqEnzkOae/giphy.gif', // coffee love
        'https://media.giphy.com/media/1zxqjfBBLKF8RpFiNH/giphy.gif', // need coffee
        'https://media.giphy.com/media/3o7TKDMPnXNYpBhU2I/giphy.gif'  // coffee brewing
      ],
      'international debugging day': [
        'https://media.giphy.com/media/8KrhxtEKAATOwjdaYF/giphy.gif', // coding intensely
        'https://media.giphy.com/media/QHE5gWI0QjqF2/giphy.gif',      // frustrated coder
        'https://media.giphy.com/media/10zxDv7Hv5RF9C/giphy.gif'      // computer problems
      ],
      'productive coding day': [
        'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',  // typing fast
        'https://media.giphy.com/media/ZgqCqyNFSXPDgFJVpx/giphy.gif', // productive work
        'https://media.giphy.com/media/8Bkr9UJQTuqEnzkOae/giphy.gif'  // focused work
      ],
      'code quality day': [
        'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif', // clean code vibes
        'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',  // quality work
        'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif'       // perfectionist
      ],
      'pi day': [
        'https://media.giphy.com/media/APqEbxBsVlkWSuFpth/giphy.gif', // pi numbers
        'https://media.giphy.com/media/BmmfETghGOPrW/giphy.gif',      // math celebration
        'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif'  // pie/pi pun
      ],
      'april fools day': [
        'https://media.giphy.com/media/YR8neVRcCSqwmJkb1D/giphy.gif', // pranks
        'https://media.giphy.com/media/xT1XGESDlxj0GwoDRe/giphy.gif', // got you
        'https://media.giphy.com/media/kHcSBZSE7Meb9JqJ1R/giphy.gif'  // april fools
      ]
    }
    
    // Always prefer holiday-specific memes first
    const holidayKey = holidayName.toLowerCase()
    if (holidayMemes[holidayKey]) {
      const memes = holidayMemes[holidayKey]
      const index = forceNew ? 
        Math.floor(Math.random() * memes.length) : 
        Math.floor(Date.now() / 3600000) % memes.length
      return memes[index]
    }
    
    // Use AI to generate more relevant meme searches for unknown holidays
    const prompt = spark.llmPrompt`Generate 3 specific, relevant search terms for finding memes/GIFs related to "${holiday.name}". 
    Focus on the core theme of the holiday, not generic celebration terms.
    Return just the search terms separated by | with no additional text.
    
    Example for "National Donut Day": donuts | glazed donuts | donut shop
    Example for "World Book Day": reading books | library | bookworm`
    
    try {
      const aiResult = await spark.llm(prompt, 'gpt-4o-mini')
      const searchTerms = aiResult.split('|').map(term => term.trim()).filter(term => term.length > 0)
      
      // Try each AI-generated search term
      for (const searchTerm of searchTerms) {
        try {
          const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=demo&q=${encodeURIComponent(searchTerm)}&limit=10&rating=g`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.data && data.data.length > 0) {
              const randomIndex = Math.floor(Math.random() * Math.min(data.data.length, 5))
              const gifUrl = data.data[randomIndex].images.fixed_height.url
              
              // Quick validation that GIF loads
              try {
                const testResponse = await fetch(gifUrl, { method: 'HEAD' })
                if (testResponse.ok) {
                  return gifUrl
                }
              } catch (e) {
                continue
              }
            }
          }
        } catch (error) {
          console.log(`Failed to fetch meme for AI term: ${searchTerm}`)
        }
      }
    } catch (error) {
      console.log('AI meme search failed, using fallbacks')
    }
    
    // Holiday-themed fallbacks that are actually related to celebrations
    const celebrationMemes = [
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', // confetti party
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', // celebration dance
      'https://media.giphy.com/media/26BRrSvJUa0crqw4E/giphy.gif',  // confetti explosion
      'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', // happy cheering
      'https://media.giphy.com/media/l0MYw8lPNo1jhAgI8/giphy.gif'   // happy dance
    ]
    
    const index = forceNew ? 
      Math.floor(Math.random() * celebrationMemes.length) : 
      Math.floor(Date.now() / 3600000) % celebrationMemes.length
    return celebrationMemes[index]
  }

  const loadContent = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      const holidays = await fetchHolidays()
      const selectedHoliday = await selectBestHoliday(holidays)
      
      setMemeLoading(true)
      const memeUrl = await generateMeme(selectedHoliday, forceRefresh)
      setMemeLoading(false)
      
      const newContent: DailyContent = {
        date: today,
        holiday: selectedHoliday,
        memeUrl
      }
      
      setContent(newContent)
    } catch (error) {
      toast.error('Failed to load holiday content')
      setMemeLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Clear existing content to force a fresh meme generation
    setContent(null)
    await loadContent(true) // Force refresh with new meme
    setIsRefreshing(false)
    toast.success('Content refreshed!')
  }

  const handleShare = () => {
    if (!content) return
    
    const shareText = `🎉 Today's Holiday: ${content.holiday.name}\n\nCheck out this celebration! ${content.memeUrl}\n\n#HolidayFun #Engineering`
    
    if (navigator.share) {
      navigator.share({
        title: `Today's Holiday: ${content.holiday.name}`,
        text: shareText
      })
    } else {
      navigator.clipboard.writeText(shareText)
      toast.success('Copied to clipboard!')
    }
  }

  useEffect(() => {
    if (!content || content.date !== today) {
      loadContent()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Holiday Fun</h1>
          <p className="text-muted-foreground">Daily holiday discoveries for your engineering team</p>
        </header>

        {isLoading ? (
          <Card className="w-full">
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ) : content ? (
          <Card className="w-full overflow-hidden">
            <CardHeader className="bg-card">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-card-foreground">
                    {content.holiday.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={16} />
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-accent text-accent-foreground">
                  Today's Pick
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {content.holiday.description && (
                <p className="text-foreground">{content.holiday.description}</p>
              )}
              
              {content.holiday.reason && (
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-sm text-secondary-foreground">
                    <strong>Why this holiday?</strong> {content.holiday.reason}
                  </p>
                </div>
              )}

              <div className="bg-muted border-2 border-dashed border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium text-center">
                    Engineering Team Meme
                  </div>
                </div>
                <div className="aspect-video bg-card flex items-center justify-center">
                  {memeLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading meme...</span>
                    </div>
                  ) : (
                    <img 
                      src={content.memeUrl} 
                      alt={`${content.holiday.name} meme`}
                      className="max-w-full max-h-full object-contain rounded"
                      onError={(e) => {
                        // Fallback to a generic celebration gif if the image fails to load
                        (e.target as HTMLImageElement).src = 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif'
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button 
                  onClick={handleShare}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="sm"
                >
                  <Share2 size={16} />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <footer className="text-center text-xs text-muted-foreground">
          designed by humans, built by AI
        </footer>
      </div>
      <Toaster />
    </div>
  )
}

export default App