from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

notes = []

class Note(BaseModel):
    id : int
    content : str


# List all notes
@app.get("/notes", status_code=200)
async def getAllNotes():
    return notes

#Get a specific note
@app.get("/notes/{id}", status_code=200)
async def getNote(id : int):
    for note in notes:
        if note.id == id:
            return note
        
    raise HTTPException(
        status_code=404, 
        detail = "Note not Found"
    )

#Create a new note
@app.post("/notes", status_code=201)
async def createNote(note : Note):
    for existing_note in notes:
        if existing_note.id == note.id:
            raise HTTPException(
                status_code=409,
                detail="Note with this ID already exists"
            )
    notes.append(note)
    return {"message" : "Note Created"}

#Update an existing note
class NoteUpdate(BaseModel):
    content: str

@app.put("/notes/{id}", status_code=200)
async def updateNote(id : int, new : NoteUpdate):
    for note in notes:
        if note.id == id:
            note.content = new.content
            return {"message" : "Updated Note"}
        
    raise HTTPException(
        status_code=404,
        detail="Note not found"
    )
        
#Delete a note
@app.delete("/notes/{id}", status_code=200)
async def deleteNote(id : int):
    for i, note in enumerate(notes):
        if note.id == id:
            notes.pop(i)
            return {"message" : "Deleted Note"}
        
    raise HTTPException(
            status_code=404,
            detail="Note not found"
        )
