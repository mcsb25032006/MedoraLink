import { NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get("file") as File | null
    const userId = String(form.get("userId") || "").trim()
    if (!file || !userId) {
      return NextResponse.json({ error: "file and userId are required" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = (() => {
      const n = file.name || ""
      const dot = n.lastIndexOf(".")
      const rawExt = dot >= 0 ? n.slice(dot + 1) : ""
      const safe = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "")
      return safe || "png"
    })()

    const dir = path.resolve(process.cwd(), "public", "profile-pics")
    try { await fs.mkdir(dir, { recursive: true }) } catch {}

    const filename = `${userId}-${Date.now()}.${ext}`
    const filePath = path.join(dir, filename)
    await fs.writeFile(filePath, buffer)

    const url = `/profile-pics/${filename}`
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}


