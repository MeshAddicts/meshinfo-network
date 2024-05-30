from datetime import datetime
from typing import List
from zoneinfo import ZoneInfo
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel, parse_obj_as
from pydantic.json import pydantic_encoder

import json

class Mesh(BaseModel):
    name: str
    short_name: str
    description: str | None = None
    url: str | None = None
    meshinfo_url: str | None = None
    contact: str | None = None
    country: str | None = None
    region: str | None = None
    metro: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    altitude: float | None = None
    timezone: str | None = None
    last_announcement: datetime | None = None

meshes = [
    Mesh(
        name="Sac Valley Mesh",
        short_name="SVM",
        url="https://www.sacvalleymesh.com",
        contact="https://www.sacvalleymesh.com",
        meshinfo_url="https://svm.meshinfo.network",
        country="US",
        region="CA",
        metro="Sacramento",
        latitude=38.5,
        longitude=-121.4,
        altitude=0,
        timezone="America/Los_Angeles",
        last_announcement=datetime.now(ZoneInfo("America/Los_Angeles")),
    ),
    Mesh(
        name="Bay Area Mesh",
        short_name="BAYM",
        url="https://bayme.sh",
        contact="https://bayme.sh",
        meshinfo_url="https://bayme.sh",
        country="US",
        region="CA",
        metro="San Francisco Bay Area",
        latitude=37.8,
        longitude=-122.4,
        altitude=0,
        timezone="America/Los_Angeles",
        last_announcement=datetime.now(ZoneInfo("America/Los_Angeles")),
    ),
]

templates = Jinja2Templates(directory="./templates")

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    global meshes
    return templates.TemplateResponse(
        request=request, name="index.html.j2", context={"meshes": meshes}
    )

@app.get("/meshes")
async def read_meshes():
    save_meshes()
    return meshes

@app.post("/meshes")
async def create_mesh(mesh: Mesh):
    meshes.append(mesh)
    save_meshes()
    return mesh

def load_meshes():
    try:
      with open("data/meshes.json", "r") as f:
          meshes_dict = json.load(f)
      meshes = parse_obj_as(List[Mesh], meshes_dict)
      return meshes
    except:
      return []

def save_meshes():
    with open("data/meshes.json", "w") as f:
        json.dump(meshes, f, default=pydantic_encoder)

save_meshes()
meshes = load_meshes()
print(meshes)
