<template>
  <v-container>
    <v-card>
      <v-card-title> 未审核感想列表 </v-card-title>
      <v-card-text>
        <data-table
          fixed-header
          :headers="headers"
          :items="thoughts"
          @click:row="rowClick"
          loading-text="加载中..."
          no-data-text="没有数据哦"
          no-results-text="没有结果"
        >
        </data-table>
      </v-card-text>
    </v-card>
    <v-dialog v-model="dialog" persistent fullscreen scrollable>
      <v-card>
        <v-card-title>详细信息</v-card-title>
        <v-card-text>
          <vol-info v-if="currentVol" :vol="currentVol" />
          <thought-info
            v-if="currentThoughtData"
            :thought="currentThoughtData"
          />
          <v-spacer />
          发放的{{ getVolTypeName(currentVol!.type) }}时长（分钟）
          <v-text-field
            v-model="currentReward"
            prepend-icon="mdi-clock-time-three-outline"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="green" @click="audit(true)">通过 </v-btn>
          <v-btn color="red" @click="audit(false)">打回 </v-btn>
          <v-btn @click="dialog = false">关闭 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-btn @click="test">test</v-btn>
  </v-container>
</template>

<script lang="ts">
import { confirm } from "@/utils/dialogs";
// import {
//   validate,
//   validateNotNAN,
//   validateNotLargerThan,
//   validateNotNegative,
// } from "@/utils/validation";
import {
  fApi,
  getVolTypeName,
  type VolunteerInfoResponse,
  type ThoughtInfoResponse,
  ThoughtStatus,
  type SingleThought,
  VolType,
  VolStatus,
} from "@/apis";
import { mapIsLoading, useInfoStore } from "@/stores";
import { timeToHint } from "@/utils/calc";
import { mapStores } from "pinia";
import { VDataTable as DataTable } from "vuetify/labs/VDataTable";
import ThoughtInfo from "@/components/thought-info.vue";
import VolInfo from "@/components/vol-info.vue";

export default {
  components: {
    DataTable,
    VolInfo,
    ThoughtInfo,
  },
  data() {
    return {
      timeToHint,
      getVolTypeName,

      headers: [
        {
          key: "volId",
          title: "义工编号",
          value: "volId",
          // align: "start",
          sortable: true,
        },
        { key: "stuId", title: "学号", value: "stuId" },
      ],

      thoughts: [
        {
          volId: 123,
          stuId: 456,
          status: ThoughtStatus.Draft,
          stuName: "stuname",
          volName: "volname",
        },
      ] as SingleThought[],

      dialog: false,
      currentVol: undefined as VolunteerInfoResponse | undefined,
      currentThoughtInfo: undefined as SingleThought | undefined,
      currentThoughtData: undefined as ThoughtInfoResponse | undefined,
      currentReward: NaN,
    };
  },
  mounted() {
    this.fetchThoughts();
  },
  methods: {
    test() {
      this.currentVol = {
        name: "VolName",
        description: "DESC",
        time: "1-1-1",
        status: VolStatus.Unaudited,
        type: VolType.Inside,
        reward: 11122222,
        signable: true,
        joiners: [
          {
            id: 1,
            name: "abc",
          },
        ],
        holder: 2,
        holderName: "aaa",
      };
      this.currentThoughtInfo = this.thoughts[0];
      this.currentThoughtData = {
        thought: "thought text",
        pics: ["1111", "1111"],
      };
      this.currentReward = this.currentVol.reward;
      this.dialog = true;
    },
    fetchThoughts() {
      fApi.searchThoughts({
        status: ThoughtStatus.WaitingForFinalAudit,
      })((result: SingleThought[]) => {
        this.thoughts = result;
      });
    },
    rowClick(
      _event: Event,
      value: {
        item: any;
      }
    ) {
      const item = value.item.raw as SingleThought;
      this.currentThoughtInfo = item;
      fApi.getVolunteerInfo(item.volId)((volunteer) => {
        fApi.getThoughtInfo(
          item.volId,
          item.stuId
        )((thought) => {
          this.currentVol = volunteer;
          this.currentThoughtData = thought;
          this.currentReward = volunteer.reward;
          this.dialog = true;
        });
      });
    },
    /**
     * @param status `true` for ok.
     */
    async audit(status: boolean) {
      let value = await confirm();
      if (value) {
        if (status) {
          fApi.finalAudit(
            this.currentThoughtInfo!.volId,
            this.currentThoughtInfo!.stuId,
            this.currentReward
          )(() => {
            this.fetchThoughts();
            this.dialog = false;
          });
        } else {
          fApi.repulse(
            this.currentThoughtInfo!.volId,
            this.currentThoughtInfo!.stuId,
            ""
          )(() => {
            this.fetchThoughts();
            this.dialog = false;
          });
        }

        // validate(
        //   [this.currentReward],
        //   [validateNotNAN(), validateNotNegative(), validateNotLargerThan(4)]
        // );
      }
    },
  },
  computed: {
    ...mapStores(useInfoStore),
  },
};
</script>

<style scoped>
.v-card {
  margin: 0.3rem;
}

.pic {
  width: auto;
  height: 120px;
}
</style>
