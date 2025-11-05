import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageItemComponent } from './message-item.component';
import { Message, MessageRole } from '../../../../core/models/message.model';

describe('MessageItemComponent', () => {
  let component: MessageItemComponent;
  let fixture: ComponentFixture<MessageItemComponent>;

  const mockMessage: Message = {
    id: 'test-message-1',
    content: 'Test message content',
    role: MessageRole.USER,
    timestamp: new Date('2024-01-15T10:30:00'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageItemComponent);
    component = fixture.componentInstance;
    component.message = mockMessage; // Set required input
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isUser getter', () => {
    it('should return true for user messages', () => {
      component.message = { ...mockMessage, role: MessageRole.USER };
      expect(component.isUser).toBe(true);
    });

    it('should return false for assistant messages', () => {
      component.message = { ...mockMessage, role: MessageRole.ASSISTANT };
      expect(component.isUser).toBe(false);
    });
  });

  describe('isAssistant getter', () => {
    it('should return true for assistant messages', () => {
      component.message = { ...mockMessage, role: MessageRole.ASSISTANT };
      expect(component.isAssistant).toBe(true);
    });

    it('should return false for user messages', () => {
      component.message = { ...mockMessage, role: MessageRole.USER };
      expect(component.isAssistant).toBe(false);
    });
  });

  describe('formattedTime getter', () => {
    it('should format timestamp correctly', () => {
      const formattedTime = component.formattedTime;
      expect(formattedTime).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });
  });

  describe('rendering', () => {
    it('should display message content', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Test message content');
    });
  });
});
