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
    
    // Use AI to generate a meme prompt that creates relevant text-based memes
    const memePrompt = spark.llmPrompt`Create a clever, funny meme text for "${holiday.name}" that would appeal to software engineers and developers. 

Think about:
- Engineering/coding culture references
- Popular meme formats that work well with text
- Technical humor or programming jokes
- Relatable developer experiences

The meme should be:
- Clean and workplace-appropriate
- Funny to engineers specifically
- Related to the holiday theme
- In a format like "WHEN [situation] BUT [reaction]" or "IT'S ACTUALLY [holiday] BUT [engineering twist]"

Return just the meme text, formatted for display on an image. Use ALL CAPS for emphasis where appropriate.`

    try {
      const memeText = await spark.llm(memePrompt, 'gpt-4o-mini')
      
      // Create a text-based meme using a reliable meme generator service
      const encodedText = encodeURIComponent(memeText.trim())
      
      // Use multiple fallback image services for better reliability
      const memeServices = [
        `https://api.memegen.link/images/custom/_/${encodedText}.jpg`,
        `https://api.memegen.link/images/drake/ignoring_work_tasks/${encodedText}.jpg`,
        `https://api.memegen.link/images/wonka/so_you_celebrate_${holidayName.replace(/\s+/g, '_')}/${encodedText}.jpg`
      ]
      
      // Try each service and return the first working one
      for (const serviceUrl of memeServices) {
        try {
          const response = await fetch(serviceUrl, { method: 'HEAD' })
          if (response.ok) {
            return serviceUrl
          }
        } catch (error) {
          continue
        }
      }
      
      // If AI text generation fails, use pre-made holiday-specific memes
      return getStaticHolidayMeme(holidayName, forceNew)
      
    } catch (error) {
      console.log('AI meme generation failed, using static memes')
      return getStaticHolidayMeme(holidayName, forceNew)
    }
  }

  const getStaticHolidayMeme = (holidayName: string, forceNew = false) => {
    // Static image URLs that are more reliable - using placeholder services and direct image URLs
    const holidayMemes: Record<string, string[]> = {
      'national tequila day': [
        'https://i.imgflip.com/2/1bij.jpg?text1=IT%27S%20ACTUALLY%20TEA-QUILA&text2=BUT%20MIND%20YOUR%20OWN%20BUSINESS',
        'https://i.imgflip.com/2/61kun.jpg?text1=WHEN%20IT%27S%20TEQUILA%20DAY&text2=BUT%20YOU%27RE%20DEBUGGING%20AT%205PM',
        'https://i.imgflip.com/2/1g8my.jpg?text1=TEQUILA%20DAY%20APPROACHES&text2=SENIOR%20DEVS%20ALREADY%20PLANNING%20HAPPY%20HOUR'
      ],
      'coffee appreciation day': [
        'https://i.imgflip.com/2/1g8my.jpg?text1=COFFEE%20APPRECIATION%20DAY&text2=FINALLY%20A%20HOLIDAY%20ENGINEERS%20UNDERSTAND',
        'https://i.imgflip.com/2/61kun.jpg?text1=IT%27S%20COFFEE%20DAY&text2=SO%20BASICALLY%20EVERY%20DAY',
        'https://i.imgflip.com/2/1bij.jpg?text1=COFFEE%20APPRECIATION%20DAY&text2=THE%20MOST%20IMPORTANT%20HOLIDAY'
      ],
      'international debugging day': [
        'https://i.imgflip.com/2/5c7lwm.jpg?text1=INTERNATIONAL%20DEBUGGING%20DAY&text2=YOU%20MEAN%20EVERY%20DAY%3F',
        'https://i.imgflip.com/2/1g8my.jpg?text1=DEBUGGING%20DAY%20IS%20HERE&text2=TIME%20TO%20CELEBRATE%20OUR%20DAILY%20STRUGGLES',
        'https://i.imgflip.com/2/61kun.jpg?text1=WHEN%20IT%27S%20DEBUGGING%20DAY&text2=BUT%20YOU%27VE%20BEEN%20CELEBRATING%20ALL%20YEAR'
      ],
      'productive coding day': [
        'https://i.imgflip.com/2/1g8my.jpg?text1=PRODUCTIVE%20CODING%20DAY&text2=FINALLY%20NO%20MEETINGS',
        'https://i.imgflip.com/2/5c7lwm.jpg?text1=PRODUCTIVE%20CODING%20DAY&text2=WHEN%20THE%20CODE%20ACTUALLY%20WORKS',
        'https://i.imgflip.com/2/61kun.jpg?text1=PRODUCTIVE%20DAY%20DECLARED&text2=SLACK%20NOTIFICATIONS%20DISABLED'
      ],
      'code quality day': [
        'https://i.imgflip.com/2/1g8my.jpg?text1=CODE%20QUALITY%20DAY&text2=TIME%20TO%20PRETEND%20WE%20REFACTOR',
        'https://i.imgflip.com/2/5c7lwm.jpg?text1=CODE%20QUALITY%20DAY&text2=DELETING%20TODO%20COMMENTS%20COUNTS',
        'https://i.imgflip.com/2/61kun.jpg?text1=WHEN%20IT%27S%20CODE%20QUALITY%20DAY&text2=BUT%20DEADLINES%20SAY%20OTHERWISE'
      ]
    }
    
    // Try exact match first
    if (holidayMemes[holidayName]) {
      const memes = holidayMemes[holidayName]
      const index = forceNew ? 
        Math.floor(Math.random() * memes.length) : 
        Math.floor(Date.now() / 3600000) % memes.length
      return memes[index]
    }
    
    // Try partial matches for variations
    for (const [key, memes] of Object.entries(holidayMemes)) {
      if (holidayName.includes(key) || key.includes(holidayName)) {
        const index = forceNew ? 
          Math.floor(Math.random() * memes.length) : 
          Math.floor(Date.now() / 3600000) % memes.length
        return memes[index]
      }
    }
    
    // Default engineering memes that work for any holiday
    const defaultMemes = [
      'https://i.imgflip.com/2/1g8my.jpg?text1=ANOTHER%20HOLIDAY&text2=MORE%20TIME%20TO%20CODE',
      'https://i.imgflip.com/2/5c7lwm.jpg?text1=HOLIDAY%20DETECTED&text2=DEPLOY%20FREQUENCY%20INCREASES',
      'https://i.imgflip.com/2/61kun.jpg?text1=WHEN%20THERE%27S%20A%20HOLIDAY&text2=BUT%20THE%20SERVERS%20DON%27T%20CARE',
      'https://i.imgflip.com/2/1bij.jpg?text1=CELEBRATING%20HOLIDAYS&text2=WITH%20CLEAN%20CODE%20AND%20COFFEE'
    ]
    
    const index = forceNew ? 
      Math.floor(Math.random() * defaultMemes.length) : 
      Math.floor(Date.now() / 3600000) % defaultMemes.length
    return defaultMemes[index]
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
          <h1 className="text-3xl font-bold text-foreground">Every Day Matters</h1>
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
                        // Fallback to a reliable engineering meme if the image fails to load
                        (e.target as HTMLImageElement).src = 'https://i.imgflip.com/2/1g8my.jpg?text1=MEME%20LOADING%20FAILED&text2=BUT%20THE%20HOLIDAY%20CONTINUES'
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