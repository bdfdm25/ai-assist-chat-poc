import { Component } from '@angular/core';
import { ChatComponent } from './features/chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatComponent],
  template: ` <app-chat /> `,
})
export class AppComponent {
  title = 'Assist Chat';
}
