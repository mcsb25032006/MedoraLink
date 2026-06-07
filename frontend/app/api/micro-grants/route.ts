import { NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const dataFilePath = path.resolve(process.cwd(), "..", "backend", "data.json")
    const file = await fs.readFile(dataFilePath, "utf-8")
    const data = JSON.parse(file)
    const grants = Array.isArray(data.micro_grants) ? data.micro_grants : []
    const sorted = [...grants].sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at || (Number(b.id || 0) - Number(a.id || 0))
    })
    return NextResponse.json({ micro_grants: sorted })
  } catch (error) {
    return NextResponse.json({ micro_grants: [], error: "Failed to read data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const title = String(body?.title || "").trim()
    const amount = Number(body?.amount || 0)
    const description = String(body?.description || "").trim()
    const userId = Number(body?.userId || 0)
    const userEmail = typeof body?.email === 'string' ? body.email : ''
    const documentName = typeof body?.documentName === 'string' ? body.documentName : null
    const documentData = typeof body?.documentData === 'string' ? body.documentData : null

    if (!title || !description || !amount || amount < 1 || amount > 200) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const dataFilePath = path.resolve(process.cwd(), "..", "backend", "data.json")
    const file = await fs.readFile(dataFilePath, "utf-8")
    const data = JSON.parse(file)
    const microGrants: any[] = Array.isArray(data.micro_grants) ? data.micro_grants : []

    let requesterName = "Anonymous"
    if (userId) {
      const profiles: any[] = Array.isArray(data.profiles) ? data.profiles : []
      const users: any[] = Array.isArray(data.users) ? data.users : []
      const profile = profiles.find(p => Number(p.user_id) === userId)
      if (profile) {
        const first = (profile.first_name || '').toString().trim()
        const last = (profile.last_name || '').toString().trim()
        const joined = `${first} ${last}`.trim()
        if (joined) requesterName = joined
      }
      if (requesterName === "Anonymous") {
        const user = users.find(u => Number(u.id) === userId)
        const email = (user?.email || userEmail || '').toString()
        if (email) requesterName = email.split('@')[0]
      }
    }

    const newId = microGrants.length > 0 ? Math.max(...microGrants.map(g => Number(g.id) || 0)) + 1 : 1
    const newGrant = {
      id: newId,
      requesterName,
      title,
      description,
      amountNeeded: amount,
      amountRaised: 0,
      timePosted: "just now",
      created_at: new Date().toISOString(),
      supporters: 0,
      verified: false,
      urgent: false,
      requestor_id: userId || null,
      documentName,
      documentData
    }

    const updated = { ...data, micro_grants: [newGrant, ...microGrants] }
    await fs.writeFile(dataFilePath, JSON.stringify(updated, null, 2), "utf-8")

    return NextResponse.json({ micro_grant: newGrant }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save grant" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const id = Number(body?.id || 0)
    const addAmount = Number(body?.amount || 0)
    if (!id || !addAmount || isNaN(addAmount)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const dataFilePath = path.resolve(process.cwd(), "..", "backend", "data.json")
    const file = await fs.readFile(dataFilePath, "utf-8")
    const data = JSON.parse(file)
    const microGrants: any[] = Array.isArray(data.micro_grants) ? data.micro_grants : []
    const idx = microGrants.findIndex((g) => Number(g.id) === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }
    const current = Number(microGrants[idx].amountRaised || 0)
    microGrants[idx].amountRaised = current + addAmount
    // Optionally bump supporters count by 1 per donation
    try {
      const supporters = Number(microGrants[idx].supporters || 0)
      microGrants[idx].supporters = supporters + 1
    } catch {}
    const updated = { ...data, micro_grants: microGrants }
    await fs.writeFile(dataFilePath, JSON.stringify(updated, null, 2), 'utf-8')
    return NextResponse.json({ micro_grant: microGrants[idx] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update grant' }, { status: 500 })
  }
}
