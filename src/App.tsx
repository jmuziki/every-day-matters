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
  memeText: string
}

function App() {
  const [content, setContent] = useKV<DailyContent | null>('daily-holiday-content', null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

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
      '10-31': [{ name: 'Halloween', description: 'The scariest bugs come out today' }],
      '12-25': [{ name: 'Christmas Day', description: 'Time for some holiday coding magic' }]
    }
    
    return fallbackHolidays[monthDay] || [
      { name: 'International Debugging Day', description: 'Every day is debugging day for engineers!' },
      { name: 'Productive Coding Day', description: 'A perfect day to ship some features' },
      { name: 'Coffee Appreciation Day', description: 'Fuel for developers worldwide' }
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

  const generateMeme = async (holiday: Holiday) => {
    const prompt = spark.llmPrompt`Create a funny meme text for "${holiday.name}" that would appeal to software engineers and developers. 

The meme should:
- Be workplace appropriate
- Relate to programming/engineering culture
- Be witty and shareable
- Reference common developer experiences

Keep it short and punchy - just return the meme text, nothing else.`

    try {
      const memeText = await spark.llm(prompt, 'gpt-4o-mini')
      return memeText.replace(/^["']|["']$/g, '') // Remove surrounding quotes
    } catch (error) {
      return `Happy ${holiday.name}! 🎉\nTime to celebrate with some quality code!`
    }
  }

  const loadContent = async () => {
    setIsLoading(true)
    try {
      const holidays = await fetchHolidays()
      const selectedHoliday = await selectBestHoliday(holidays)
      const memeText = await generateMeme(selectedHoliday)
      
      const newContent: DailyContent = {
        date: today,
        holiday: selectedHoliday,
        memeText
      }
      
      setContent(newContent)
    } catch (error) {
      toast.error('Failed to load holiday content')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadContent()
    setIsRefreshing(false)
    toast.success('Content refreshed!')
  }

  const handleShare = () => {
    if (!content) return
    
    const shareText = `🎉 Today's Holiday: ${content.holiday.name}\n\n${content.memeText}\n\n#HolidayFun #Engineering`
    
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

              <div className="bg-muted border-2 border-dashed border-border rounded-lg p-6 text-center">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Engineering Team Meme
                  </div>
                  <div className="text-lg font-semibold text-foreground whitespace-pre-line">
                    {content.memeText}
                  </div>
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
          Bringing daily joy to engineering teams, one holiday at a time
        </footer>
      </div>
      <Toaster />
    </div>
  )
}

export default App