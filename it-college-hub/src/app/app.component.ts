import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';

type Note = { id: number; title: string; body: string; image_data?: string | null; created_at: string };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  notes: Note[] = [];
  title = '';
  body = '';
  imageData: string | null = null;
  loading = false;
  apiOnline = false;
  constructor(private toast: ToastController) {}
  ngOnInit() { this.load(); }
  async load() {
    this.loading = true;
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error('API unavailable');
      this.notes = await res.json();
      this.apiOnline = true;
    } catch { this.apiOnline = false; }
    finally { this.loading = false; }
  }
  async chooseImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { await this.message('Зображення має бути до 2 МБ'); return; }
    const reader = new FileReader();
    reader.onload = () => this.imageData = String(reader.result);
    reader.readAsDataURL(file);
  }
  async addNote() {
    if (!this.title.trim() || !this.body.trim()) { await this.message('Заповни назву та опис'); return; }
    this.loading = true;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: this.title, body: this.body, image_data: this.imageData })
      });
      if (!res.ok) throw new Error('Не вдалося зберегти запис');
      this.title = ''; this.body = ''; this.imageData = null;
      await this.load();
      await this.message('Публікацію збережено в базі даних');
    } catch (e) { await this.message(e instanceof Error ? e.message : 'Помилка'); }
    finally { this.loading = false; }
  }
  async message(message: string) {
    const t = await this.toast.create({ message, duration: 2400, position: 'bottom' });
    await t.present();
  }
}