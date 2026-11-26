import { useEffect, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createMMKV } from 'react-native-mmkv';

// Brutalist Office — designdotmd.directory/brutalist-office
const C = {
  primary: '#0A0A0A',
  secondary: '#4B4B4B',
  accent: '#E8FF00',
  neutral: '#E8E6E1',
  surface: '#FFFFFF',
};
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

type Todo = { id: string; text: string; done: boolean };

const storage = createMMKV();
const KEY = 'todos';

function load(): Todo[] {
  try {
    const raw = storage.getString(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function App() {
  return (
    <SafeAreaProvider>
      <TodoScreen />
    </SafeAreaProvider>
  );
}

function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>(load);
  const [text, setText] = useState('');

  useEffect(() => {
    storage.set(KEY, JSON.stringify(todos));
  }, [todos]);

  const open = todos.filter((t) => !t.done).length;
  const done = todos.length - open;

  const add = () => {
    const value = text.trim();
    if (!value) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTodos((ts) => [{ id: String(Date.now()), text: value, done: false }, ...ts]);
    setText('');
  };

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const remove = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTodos((ts) => ts.filter((t) => t.id !== id));
  };

  const sorted = [...todos.filter((t) => !t.done), ...todos.filter((t) => t.done)];

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.header} onPress={Keyboard.dismiss}>
          <Text style={s.kicker}>SYS/TASKS — v1.0</Text>
          <Text style={s.display}>TODO_</Text>
          <View style={s.stats}>
            <Stat label="OPEN" value={pad(open)} />
            <Stat label="DONE" value={pad(done)} />
            <Stat label="TOTAL" value={pad(todos.length)} last />
          </View>
        </Pressable>

        <View style={s.inputRow}>
          <Text style={s.prompt}>&gt;</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            placeholder="new task"
            placeholderTextColor={C.secondary}
            style={s.input}
            returnKeyType="done"
            submitBehavior="submit"
            autoCapitalize="none"
            selectionColor={C.primary}
          />
          <PressBox onPress={add} style={s.addBtn} pressedStyle={s.pressed}>
            <Text style={s.addText}>ADD</Text>
          </PressBox>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyBig}>[ EMPTY ]</Text>
              <Text style={s.emptySmall}>NOTHING SCHEDULED. ENJOY THE CONCRETE.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <PressBox
              onPress={() => toggle(item.id)}
              style={s.row}
              pressedStyle={{ backgroundColor: C.neutral }}
            >
              <Text style={s.index}>{pad(index + 1)}</Text>
              <View style={[s.box, item.done && s.boxDone]}>
                {item.done && <Text style={s.check}>X</Text>}
              </View>
              <Text style={[s.text, item.done && s.textDone]} numberOfLines={3}>
                {item.text}
              </Text>
              <Pressable onPress={() => remove(item.id)} hitSlop={12} style={s.del}>
                <Text style={s.delText}>DEL</Text>
              </Pressable>
            </PressBox>
          )}
        />

        {done > 0 && (
          <PressBox
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTodos((ts) => ts.filter((t) => !t.done));
            }}
            style={s.footer}
            pressedStyle={{ backgroundColor: C.secondary }}
          >
            <Text style={s.footerText}>PURGE {pad(done)} COMPLETED ↓</Text>
          </PressBox>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PressBox({
  onPress,
  style,
  pressedStyle,
  children,
}: {
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  pressedStyle: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[style, pressed && pressedStyle]}
    >
      {children}
    </Pressable>
  );
}

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.stat, !last && s.statDivider]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.neutral },
  header: { paddingHorizontal: 16, paddingTop: 16 },
  kicker: { fontFamily: MONO, fontSize: 12, color: C.secondary, letterSpacing: 1 },
  display: {
    fontFamily: MONO,
    fontSize: 64,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -2.5,
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.surface,
    marginTop: 12,
  },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  statDivider: { borderRightWidth: 2, borderRightColor: C.primary },
  statValue: { fontFamily: MONO, fontSize: 28, fontWeight: '700', color: C.primary },
  statLabel: { fontFamily: MONO, fontSize: 11, color: C.secondary, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.surface,
  },
  prompt: {
    fontFamily: MONO,
    fontSize: 18,
    fontWeight: '700',
    color: C.primary,
    paddingLeft: 12,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 16,
    color: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  addBtn: {
    backgroundColor: C.accent,
    borderLeftWidth: 2,
    borderLeftColor: C.primary,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  pressed: { backgroundColor: '#C9DD00' },
  addText: { fontFamily: MONO, fontSize: 15, fontWeight: '700', color: C.primary },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.primary,
    marginTop: -2,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 12,
  },
  index: { fontFamily: MONO, fontSize: 12, color: C.secondary, width: 20 },
  box: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: C.primary },
  check: { fontFamily: MONO, fontSize: 13, fontWeight: '700', color: C.accent },
  text: { flex: 1, fontFamily: MONO, fontSize: 15, color: C.primary, lineHeight: 22 },
  textDone: { color: C.secondary, textDecorationLine: 'line-through' },
  del: { paddingHorizontal: 4 },
  delText: { fontFamily: MONO, fontSize: 11, color: C.secondary, textDecorationLine: 'underline' },
  empty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.secondary,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBig: { fontFamily: MONO, fontSize: 22, fontWeight: '700', color: C.primary },
  emptySmall: { fontFamily: MONO, fontSize: 11, color: C.secondary, marginTop: 8 },
  footer: { backgroundColor: C.primary, paddingVertical: 18, paddingBottom: 34, alignItems: 'center' },
  footerText: { fontFamily: MONO, fontSize: 13, fontWeight: '700', color: C.surface, letterSpacing: 1 },
});
