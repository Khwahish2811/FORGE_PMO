import json
from channels.generic.websocket import AsyncWebsocketConsumer

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "dashboard_updates"
        # Sabhi users ko ek hi group mein dalenge
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Jab backend se signal aaye, tab frontend ko message bhejo
    async def send_update(self, event):
        await self.send(text_data=json.dumps(event["message"]))