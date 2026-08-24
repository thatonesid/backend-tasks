import React from 'react'
import { useEffect, useState } from 'react'

// Vite exposes only environment variables prefixed with VITE_.
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

function getErrorMessage(status, detail) {
  const messages = {
    400: 'The request was invalid. Please check the values and try again.',
    404: 'No note was found with that ID.',
    409: 'A note with this ID already exists.',
    422: 'Please enter a valid numeric ID and note content.',
    500: 'The server had a problem. Please try again shortly.',
  }

  return detail || messages[status] || `Request failed with status ${status}.`
}

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not set. Add it to your .env file and restart Vite.')
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, options)
  } catch {
    throw new Error('Could not reach the API. Make sure the backend is running and the API URL is correct.')
  }

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const detail = typeof data === 'object' && data ? data.detail : ''
    throw new Error(getErrorMessage(response.status, detail))
  }

  return data
}

function App() {
  const [notes, setNotes] = useState([])
  const [newId, setNewId] = useState('')
  const [newContent, setNewContent] = useState('')
  const [findId, setFindId] = useState('')
  const [foundNote, setFoundNote] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState(null)

  async function loadNotes() {
    setLoadingNotes(true)
    try {
      const data = await request('/notes')
      setNotes(data)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoadingNotes(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [])

  async function handleCreate(event) {
    event.preventDefault()
    if (newId === '' || !newContent.trim()) {
      setMessage({ type: 'error', text: 'Enter both a note ID and content.' })
      return
    }

    setWorking(true)
    try {
      await request('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(newId), content: newContent.trim() }),
      })
      setNewId('')
      setNewContent('')
      setMessage({ type: 'success', text: 'Note created successfully.' })
      await loadNotes()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setWorking(false)
    }
  }

  async function handleFind(event) {
    event.preventDefault()
    if (findId === '') {
      setMessage({ type: 'error', text: 'Enter an ID to find a note.' })
      return
    }

    setWorking(true)
    setFoundNote(null)
    try {
      const note = await request(`/notes/${findId}`)
      setFoundNote(note)
      setMessage({ type: 'success', text: `Found note #${note.id}.` })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setWorking(false)
    }
  }

  function startEditing(note) {
    setEditingId(note.id)
    setEditingContent(note.content)
    setMessage(null)
  }

  async function handleUpdate(event, id) {
    event.preventDefault()
    if (!editingContent.trim()) {
      setMessage({ type: 'error', text: 'Note content cannot be empty.' })
      return
    }

    setWorking(true)
    try {
      await request(`/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent.trim() }),
      })
      setEditingId(null)
      setMessage({ type: 'success', text: `Note #${id} updated successfully.` })
      await loadNotes()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setWorking(false)
    }
  }

  async function handleDelete(id) {
    setWorking(true)
    try {
      await request(`/notes/${id}`, { method: 'DELETE' })
      setMessage({ type: 'success', text: `Note #${id} deleted successfully.` })
      if (foundNote?.id === id) setFoundNote(null)
      await loadNotes()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">FastAPI + React</p>
        <h1>Notes API Demo</h1>
        <p>Use this small client to create, read, update, and delete notes.</p>
      </header>

      {message && <div className={`message ${message.type}`} role="status">{message.text}</div>}

      <section className="panel forms-grid" aria-label="Create and find notes">
        <form onSubmit={handleCreate}>
          <h2>Add a note</h2>
          <label htmlFor="new-id">Note ID</label>
          <input id="new-id" type="number" value={newId} onChange={(event) => setNewId(event.target.value)} placeholder="For example: 1" required />
          <label htmlFor="new-content">Content</label>
          <textarea id="new-content" value={newContent} onChange={(event) => setNewContent(event.target.value)} placeholder="Write a short note..." rows="3" required />
          <button type="submit" disabled={working}>{working ? 'Working...' : 'Add Note'}</button>
        </form>

        <form onSubmit={handleFind}>
          <h2>Find a note</h2>
          <label htmlFor="find-id">Note ID</label>
          <div className="inline-form">
            <input id="find-id" type="number" value={findId} onChange={(event) => setFindId(event.target.value)} placeholder="For example: 1" required />
            <button type="submit" disabled={working}>{working ? 'Working...' : 'Find Note'}</button>
          </div>
          {foundNote && <div className="found-note"><strong>Note #{foundNote.id}</strong><p>{foundNote.content}</p></div>}
        </form>
      </section>

      <section className="panel notes-panel" aria-labelledby="notes-title">
        <div className="section-heading">
          <div><h2 id="notes-title">All notes</h2><p>Fetched from <code>GET /notes</code></p></div>
          <button className="secondary-button" onClick={loadNotes} disabled={loadingNotes || working}>{loadingNotes ? 'Refreshing...' : 'Refresh'}</button>
        </div>

        {loadingNotes ? (
          <p className="empty-state">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="empty-state">No notes yet. Add one above to get started.</p>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <article className="note-card" key={note.id}>
                <div className="note-content">
                  <span className="note-id">Note #{note.id}</span>
                  {editingId === note.id ? (
                    <form onSubmit={(event) => handleUpdate(event, note.id)}>
                      <label className="sr-only" htmlFor={`edit-${note.id}`}>Updated content</label>
                      <textarea id={`edit-${note.id}`} value={editingContent} onChange={(event) => setEditingContent(event.target.value)} rows="3" autoFocus />
                      <div className="edit-actions"><button type="submit" disabled={working}>Save</button><button type="button" className="text-button" onClick={() => setEditingId(null)} disabled={working}>Cancel</button></div>
                    </form>
                  ) : <p>{note.content}</p>}
                </div>
                {editingId !== note.id && <div className="card-actions"><button className="secondary-button" onClick={() => startEditing(note)} disabled={working}>Edit</button><button className="danger-button" onClick={() => handleDelete(note.id)} disabled={working}>Delete</button></div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
